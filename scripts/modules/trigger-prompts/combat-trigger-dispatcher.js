import { TRIGGER_EVENT_TYPE, TRIGGER_ID } from "./constants.js";
import { ActorTriggerConfiguration } from "./actor-trigger-configuration.js";
import { getTrigger, TRIGGERS } from "./trigger-registry.js";
import { MarkOwnershipStore } from "../mark-ownership/mark-ownership-store.js";

/**
 * Evaluates combat events on the primary GM and delivers eligible prompts.
 *
 * This is the authority seam for Trigger Prompts: only the elected primary GM
 * resolves combat documents, evaluates definitions, and creates chat cards.
 */
export class CombatTriggerDispatcher {
  /**
   * @param {import("./trigger-prompt-chat.js").TriggerPromptChat} promptChat
   *   Chat-card module used after an actor and its eligible powers are found.
   */
  constructor(promptChat) {
    this.promptChat = promptChat;
  }

  /**
   * Evaluates every configured attack-result trigger for each attacked token.
   *
   * @param {object} context
   *   Captured attacker, target, defense, total, and natural-d20 data.
   * @returns {Promise<void>}
   */
  async evaluateAttack(context) {
    if (!this.#canEvaluate()) {
      return;
    }
    const attacker = this.#combatant(context.sceneId, context.attackerTokenId);
    if (!attacker) {
      return;
    }
    for (const targetData of context.targets ?? []) {
      const target = this.#combatant(targetData.sceneId, targetData.tokenId);
      if (!target) {
        continue;
      }
      const outcome = this.#outcome(context, targetData);
      if (!outcome) {
        continue;
      }
      await this.#dispatchAttackResult({ type: TRIGGER_EVENT_TYPE.ATTACK_RESULT, outcome, attacker, target });
    }
  }

  /**
   * Evaluates movement-based triggers using the token's old position and its
   * pending destination.
   *
   * @param {TokenDocument} document
   * @param {object} changes
   * @returns {Promise<void>}
   */
  async evaluateMovement(document, changes) {
    if (!this.#canEvaluate()) {
      return;
    }
    const combatant = this.#combatant(document.parent.id, document.id);
    if (!combatant) {
      return;
    }
    await this.#dispatch(TRIGGER_ID.OPPORTUNITY_ATTACK, {
      type: TRIGGER_EVENT_TYPE.MOVEMENT,
      combatant,
      sceneId: document.parent.id,
      tokenId: document.id,
      destination: {
        x: changes.x ?? document.x,
        y: changes.y ?? document.y,
      },
    });
    await this.#dispatch(TRIGGER_ID.MARKED_CREATURE_SHIFTS_ADJACENT, {
      type: TRIGGER_EVENT_TYPE.MOVEMENT,
      combatant,
      sceneId: document.parent.id,
      tokenId: document.id,
      destination: {
        x: changes.x ?? document.x,
        y: changes.y ?? document.y,
      },
    });
  }

  /**
   * Dispatches a bloodied event when HP crosses the actor's threshold.
   *
   * @param {Actor} actor
   * @param {object} changes
   * @param {object} options
   */
  async evaluateBloodied(actor, changes, options) {
    if (!this.#canEvaluate()) {
      return;
    }
    const oldHp = options.dnd4e?.hp?.hp;
    const newHp = actor.system.attributes?.hp?.value;
    const threshold = actor.system.details?.bloodied ?? actor.system.attributes?.hp?.max / 2;
    if (!Number.isFinite(oldHp) || !Number.isFinite(newHp) || oldHp <= threshold || newHp > threshold) {
      return;
    }
    for (const combatant of game.combat.combatants) {
      if (combatant.actor?.uuid === actor.uuid) {
        await this.#dispatch(TRIGGER_ID.MARKED_CREATURE_BLOODIED, {
          type: TRIGGER_EVENT_TYPE.BLOODIED,
          combatant,
          sceneId: combatant.sceneId,
          tokenId: combatant.tokenId,
        });
      }
    }
  }

  /**
   * Evaluates a miss produced by the optional Player Defense workflow.
   *
   * @param {object} context
   * @returns {Promise<void>}
   */
  async evaluateActiveDefenseMiss(context) {
    if (!this.#canEvaluate()) {
      return;
    }
    const attacker = this.#combatant(context.sceneId, context.attackerTokenId);
    const target = this.#combatant(context.targetSceneId, context.targetTokenId);
    if (attacker && target) {
      await this.#dispatchAttackResult({ type: TRIGGER_EVENT_TYPE.ATTACK_RESULT, outcome: "miss", attacker, target });
    }
  }

  /**
   * Evaluates one registered trigger and delivers every returned prompt context.
   *
   * @param {string} triggerId
   * @param {object} event
   * @returns {Promise<void>}
   */
  async #dispatch(triggerId, event) {
    const trigger = getTrigger(triggerId);
    if (!trigger) {
      return;
    }
    for (const context of trigger.evaluate(event, this.#triggerServices())) {
      await this.#deliver(trigger, context);
    }
  }

  /**
   * Evaluates all registered definitions against a resolved attack result.
   *
   * Definitions that do not handle attack results return no prompt contexts.
   *
   * @param {object} event
   * @returns {Promise<void>}
   */
  async #dispatchAttackResult(event) {
    for (const trigger of TRIGGERS) {
      await this.#dispatch(trigger.id, event);
    }
  }

  /**
   * Resolves eligible powers and active recipients, then creates a prompt.
   *
   * @param {object} trigger
   * @param {{actor: Actor, detail: string}} context
   * @returns {Promise<void>}
   */
  async #deliver(trigger, context) {
    const assignments = ActorTriggerConfiguration.eligibleAssignmentsFor(context.actor, trigger, context);
    if (!assignments.length) {
      return;
    }
    const recipientIds = game.users.filter(user => user.active && (user.isGM || context.actor.testUserPermission(user, "OWNER"))).map(user => user.id);
    await this.promptChat.create({ trigger, actor: context.actor, assignments, context, recipientIds });
  }

  /** @returns {boolean} Whether this client is the active combat's primary GM. */
  #canEvaluate() { return game.user.isGM && game.combat?.started && game.users.filter(user => user.active && user.isGM).sort((left, right) => left.id.localeCompare(right.id))[0]?.id === game.user.id; }

  /** @returns {Combatant|undefined} Combatant occupying the supplied scene token. */
  #combatant(sceneId, tokenId) { return game.combat?.combatants.find(combatant => combatant.sceneId === sceneId && combatant.tokenId === tokenId); }

  /** @returns {TokenDocument|undefined} Token document in the supplied scene. */
  #token(sceneId, tokenId) { return game.scenes.get(sceneId)?.tokens.get(tokenId); }

  /**
   * Builds the narrow Foundry adapter exposed to pure trigger definitions.
   *
   * @returns {object}
   */
  #triggerServices() { return { combatants: game.combat.combatants, getToken: (sceneId, tokenId) => this.#token(sceneId, tokenId), markOwner: target => this.#markOwner(target), areHostile: (left, right) => left.disposition !== right.disposition, areAllies: (left, right) => left.disposition === right.disposition, distanceSquares: (left, right) => this.#distanceSquares(left, right), movesAdjacent: (mover, destination, candidate) => this.#movesAdjacent(mover, destination, candidate) }; }

  /**
   * Resolves a marked token's owner when that owner is currently in combat.
   *
   * @param {TokenDocument} target
   * @returns {TokenDocument|null}
   */
  #markOwner(target) {
    const owner = MarkOwnershipStore.ownerForTarget(target);
    return owner && this.#combatant(owner.parent.id, owner.id) ? owner : null;
  }

  /**
   * Derives hit or miss from DnD4e data, honoring recorded misses and natural
   * 1/20 overrides before comparing the attack total with the defense.
   *
   * @param {object} context
   * @param {object} target
   * @returns {"hit"|"miss"|null}
   */
  #outcome(context, target) {
    if (target.missed || context.natural === 1) {
      return "miss";
    }
    if (context.natural === 20) {
      return "hit";
    }
    if (target.defense === null || context.total === undefined) {
      return null;
    }
    return context.total < target.defense ? "miss" : "hit";
  }

  /**
   * Measures Chebyshev distance between token centers in grid squares.
   *
   * @param {TokenDocument} left
   * @param {TokenDocument} right
   * @returns {number}
   */
  #distanceSquares(left, right) {
    const gridSize = canvas.grid.size;
    const leftCenter = { x: left.x + left.width * gridSize / 2, y: left.y + left.height * gridSize / 2 };
    const rightCenter = { x: right.x + right.width * gridSize / 2, y: right.y + right.height * gridSize / 2 };
    return Math.max(Math.abs(leftCenter.x - rightCenter.x), Math.abs(leftCenter.y - rightCenter.y)) / gridSize;
  }

  /**
   * Checks whether movement starts or passes adjacent to a candidate token.
   *
   * The final destination point is excluded so ending adjacent without moving
   * while adjacent does not qualify as an opportunity-attack event.
   *
   * @param {TokenDocument} mover
   * @param {{x: number, y: number}} destination
   * @param {TokenDocument} candidate
   * @returns {boolean}
   */
  #movesAdjacent(mover, destination, candidate) {
    const gridSize = canvas.grid.size;
    const distance = Math.max(Math.abs(destination.x - mover.x), Math.abs(destination.y - mover.y));
    const steps = Math.max(1, Math.ceil(distance / gridSize));
    // An opportunity attack needs movement while adjacent. Ending adjacent is
    // not enough, so deliberately exclude the final destination square.
    for (let step = 0; step < steps; step += 1) {
      const progress = step / steps;
      const x = mover.x + (destination.x - mover.x) * progress;
      const y = mover.y + (destination.y - mover.y) * progress;
      if (Math.max(Math.abs(x - candidate.x), Math.abs(y - candidate.y)) <= gridSize) {
        return true;
      }
    }
    return false;
  }
}

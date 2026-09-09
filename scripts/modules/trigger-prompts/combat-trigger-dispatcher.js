import { Logger } from "../../shared/logger.js";
import { TRIGGER_EVENT_TYPE, TRIGGER_ID } from "./constants.js";
import { ActorTriggerConfiguration } from "./actor-trigger-configuration.js";
import { getTrigger, TRIGGERS } from "./trigger-registry.js";

/** Evaluates combat events on the primary GM and delivers eligible prompts. */
export class CombatTriggerDispatcher {
  /** @param {import("./trigger-prompt-chat.js").TriggerPromptChat} promptChat */
  constructor(promptChat) {
    this.promptChat = promptChat;
  }

  /** @param {object} context */
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

  /** @param {TokenDocument} document @param {object} changes */
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
  }

  /** @param {object} context */
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

  /** @param {string} triggerId @param {object} event */
  async #dispatch(triggerId, event) {
    const trigger = getTrigger(triggerId);
    if (!trigger) {
      return;
    }
    for (const context of trigger.evaluate(event, this.#triggerServices())) {
      await this.#deliver(trigger, context);
    }
  }

  /** @param {object} event */
  async #dispatchAttackResult(event) {
    for (const trigger of TRIGGERS) {
      await this.#dispatch(trigger.id, event);
    }
  }

  /** @param {object} trigger @param {{actor: Actor, detail: string}} context */
  async #deliver(trigger, context) {
    if (!ActorTriggerConfiguration.isEnabled(context.actor, trigger)) {
      return;
    }
    const item = ActorTriggerConfiguration.resolveAbility(context.actor, trigger);
    if (!item) {
      Logger.warn("Trigger prompt suppressed because its ability was not found", { actorId: context.actor.id, actorName: context.actor.name, triggerId: trigger.id });
      return;
    }
    const recipientIds = game.users.filter(user => user.active && (user.isGM || context.actor.testUserPermission(user, "OWNER"))).map(user => user.id);
    await this.promptChat.create({ trigger, actor: context.actor, item, context, recipientIds });
  }

  #canEvaluate() { return game.user.isGM && game.combat?.started && game.users.filter(user => user.active && user.isGM).sort((left, right) => left.id.localeCompare(right.id))[0]?.id === game.user.id; }
  #combatant(sceneId, tokenId) { return game.combat?.combatants.find(combatant => combatant.sceneId === sceneId && combatant.tokenId === tokenId); }
  #token(sceneId, tokenId) { return game.scenes.get(sceneId)?.tokens.get(tokenId); }
  #triggerServices() { return { combatants: game.combat.combatants, getToken: (sceneId, tokenId) => this.#token(sceneId, tokenId), areHostile: (left, right) => left.disposition !== right.disposition, areAllies: (left, right) => left.disposition === right.disposition, rangeSquares: (actor, trigger) => ActorTriggerConfiguration.rangeSquares(actor, trigger), isWithinRange: (left, right, rangeSquares) => rangeSquares === null || this.#distanceSquares(left, right) <= rangeSquares, movesAdjacent: (mover, destination, candidate) => this.#movesAdjacent(mover, destination, candidate) }; }

  /** @param {object} context @param {object} target */
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

  /** @param {TokenDocument} left @param {TokenDocument} right */
  #distanceSquares(left, right) {
    const gridSize = canvas.grid.size;
    const leftCenter = { x: left.x + left.width * gridSize / 2, y: left.y + left.height * gridSize / 2 };
    const rightCenter = { x: right.x + right.width * gridSize / 2, y: right.y + right.height * gridSize / 2 };
    return Math.max(Math.abs(leftCenter.x - rightCenter.x), Math.abs(leftCenter.y - rightCenter.y)) / gridSize;
  }

  /** @param {TokenDocument} mover @param {{x: number, y: number}} destination @param {TokenDocument} candidate */
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

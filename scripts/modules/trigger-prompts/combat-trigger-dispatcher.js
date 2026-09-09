import { Logger } from "../../shared/logger.js";
import { TRIGGER_EVENT_TYPE, TRIGGER_ID } from "./constants.js";
import { ActorTriggerConfiguration } from "./actor-trigger-configuration.js";
import { getTrigger } from "./trigger-registry.js";

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
      if (!target || !this.#isMiss(context, targetData)) {
        continue;
      }
      await this.#dispatch(TRIGGER_ID.ENEMY_MISSES_ALLY, { type: TRIGGER_EVENT_TYPE.MISS, attacker, target });
    }
  }

  /** @param {TokenDocument} document */
  async evaluateMovement(document) {
    if (!this.#canEvaluate()) {
      return;
    }
    const combatant = this.#combatant(document.parent.id, document.id);
    if (!combatant) {
      return;
    }
    await this.#dispatch(TRIGGER_ID.OPPORTUNITY_ATTACK, { type: TRIGGER_EVENT_TYPE.MOVEMENT, combatant, sceneId: document.parent.id, tokenId: document.id });
  }

  /** @param {object} context */
  async evaluateActiveDefenseMiss(context) {
    if (!this.#canEvaluate()) {
      return;
    }
    const attacker = this.#combatant(context.sceneId, context.attackerTokenId);
    const target = this.#combatant(context.targetSceneId, context.targetTokenId);
    if (attacker && target) {
      await this.#dispatch(TRIGGER_ID.ENEMY_MISSES_ALLY, { type: TRIGGER_EVENT_TYPE.MISS, attacker, target });
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
  #triggerServices() { return { combatants: game.combat.combatants, getToken: (sceneId, tokenId) => this.#token(sceneId, tokenId), areHostile: (left, right) => left.disposition !== right.disposition, areAllies: (left, right) => left.disposition === right.disposition, areAdjacent: (left, right) => { const size = canvas.grid.size; return Math.max(Math.abs(left.x - right.x), Math.abs(left.y - right.y)) <= size && (left.x !== right.x || left.y !== right.y); } }; }
  #isMiss(context, target) { return target.missed || (target.defense !== null && context.total !== undefined && (context.natural === 1 || context.natural !== 20 && context.total < target.defense)); }
}

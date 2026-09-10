import { Logger } from "../../shared/logger.js";
import { TRIGGER_PROMPT_UI, TRIGGER_SOCKET_ACTION } from "./constants.js";
import { ActorTriggerConfiguration } from "./actor-trigger-configuration.js";
import { CombatTriggerDispatcher } from "./combat-trigger-dispatcher.js";
import { TriggerPromptChat } from "./trigger-prompt-chat.js";

/**
 * Foundry hook adapter for the trigger-prompt submodule.
 *
 * The adapter records the DnD4e attack hook until its chat message is created,
 * then translates Foundry events into the dispatcher, configuration, and
 * private-chat module interfaces.
 */
export class TriggerPrompts {
  /**
   * @param {object} socket
   *   Registered SocketLib module used to evaluate player-originated attacks
   *   on the primary GM.
   */
  constructor(socket) {
    this.socket = socket;
    this.lastAttack = null;
    this.promptChat = new TriggerPromptChat(socket);
    this.dispatcher = new CombatTriggerDispatcher(this.promptChat);
  }

  /**
   * Captures DnD4e's attack metadata before the corresponding chat message is
   * created. The subsequent message hook adds the final roll total.
   *
   * @param {Item} item
   * @param {object} target
   * @param {object} speaker
   */
  static onRollAttack(item, target, speaker) {
    if (!game.TriggerPrompts) {
      return;
    }
    game.TriggerPrompts.lastAttack = {
      itemName: item.name,
      attackerActorId: speaker.actor,
      attackerTokenId: speaker.token ?? null,
      sceneId: canvas.scene?.id ?? null,
      targets: (target.targets ?? []).map((token, index) => ({
        actorId: token.actor?.id ?? null,
        tokenId: token.id,
        sceneId: token.document?.parent?.id ?? token.scene?.id ?? canvas.scene?.id ?? null,
        defense: target.targDefValArray?.[index] ?? null,
        missed: target.targetMissed?.some(missedToken => missedToken.id === token.id) ?? false,
      })),
    };
  }

  /**
   * Completes a captured attack with its d20 result and sends it to the GM.
   *
   * @param {ChatMessage} message
   * @param {object} socket
   */
  static onPowerChatMessage(message, socket) {
    const attack = game.TriggerPrompts?.lastAttack;
    if (!attack || !message.flavor?.includes(attack.itemName) || !message.rolls?.[0]) {
      return;
    }
    game.TriggerPrompts.lastAttack = null;
    const roll = message.rolls[0];
    socket.executeAsGM(TRIGGER_SOCKET_ACTION.EVALUATE_ATTACK, { ...attack, total: roll.total, natural: TriggerPrompts.#naturalD20(roll) })
      .catch(error => Logger.error("Failed to evaluate trigger attack", { error: error.message }));
  }

  /**
   * SocketLib entry point that evaluates an attack on the authoritative GM.
   *
   * @param {object} context
   * @returns {Promise<void>}
   */
  static async evaluateAttackFromSocket(context) {
    await game.TriggerPrompts?.dispatcher.evaluateAttack(context);
  }

  /**
   * Evaluates movement triggers before a token's coordinates are changed.
   *
   * @param {TokenDocument} document
   * @param {object} changes
   * @returns {Promise<void>}
   */
  static async onPreUpdateToken(document, changes) {
    if (!game.user.isGM || !game.TriggerPrompts || (changes.x === undefined && changes.y === undefined)) {
      return;
    }
    await game.TriggerPrompts.dispatcher.evaluateMovement(document, changes);
  }

  /**
   * Passes completed HP updates to the primary-GM dispatcher. DnD4e carries
   * the previous HP value in the update options.
   *
   * @param {Actor} actor
   * @param {object} changes
   * @param {object} options
   * @returns {Promise<void>}
   */
  static async onUpdateActor(actor, changes, options) {
    await game.TriggerPrompts?.dispatcher.evaluateBloodied(actor, changes, options);
  }

  /**
   * Adds the trigger-configuration control to legacy actor sheets.
   *
   * @param {object} app
   * @param {object[]} buttons
   */
  static onGetActorSheetHeaderButtons(app, buttons) {
    const actor = app.actor;
    if (!actor || !game.user.isGM && !actor.isOwner) {
      return;
    }
    buttons.unshift({ class: TRIGGER_PROMPT_UI.CONFIG_CLASS, icon: "fas fa-bolt", label: "Trigger prompts", onclick: () => ActorTriggerConfiguration.showActorDialog(actor) });
  }

  /**
   * Adds the configuration control to Foundry v13 ApplicationV2 actor sheets.
   *
   * @param {object} app
   * @param {object[]} controls
   */
  static onGetHeaderControlsApplicationV2(app, controls) {
    const actor = app.document;
    if (!actor || actor.documentName !== "Actor" || !game.user.isGM && !actor.isOwner) {
      return;
    }
    if (controls.some(control => control.action === TRIGGER_PROMPT_UI.CONFIG_ACTION)) {
      return;
    }

    controls.unshift({
      label: "Trigger prompts",
      icon: "fas fa-bolt",
      class: TRIGGER_PROMPT_UI.CONFIG_CLASS,
      action: TRIGGER_PROMPT_UI.CONFIG_ACTION,
      onClick: () => ActorTriggerConfiguration.showActorDialog(actor),
    });
  }

  /**
   * Delegates rendered prompt-card controls to the chat module.
   *
   * @param {ChatMessage} message
   * @param {JQuery} html
   */
  static onRenderChatMessage(message, html) {
    game.TriggerPrompts?.promptChat.bind(message, html);
  }

  /**
   * Receives a Player Defense miss after its GM-authoritative resolution.
   *
   * @param {object} context
   * @returns {Promise<void>}
   */
  async onActiveDefenseMiss(context) {
    await this.dispatcher.evaluateActiveDefenseMiss(context);
  }

  /**
   * Extracts the first active d20 face from a Foundry roll.
   *
   * @param {Roll} roll
   * @returns {number|null}
   */
  static #naturalD20(roll) {
    const die = roll.dice?.find(candidate => candidate.faces === 20);
    return die?.results?.find(result => result.active !== false)?.result ?? null;
  }
}

import { Logger } from "../../shared/logger.js";
import { TRIGGER_PROMPT_ACTION, TRIGGER_PROMPT_FLAG, TRIGGER_PROMPT_TIMEOUT_MS, TRIGGER_PROMPT_UI, TRIGGER_SOCKET_ACTION } from "./constants.js";

/**
 * Creates recipient-only prompt cards and binds their client-side controls.
 *
 * Chat-message mutation is delegated to SocketLib GM handlers so multiple
 * recipients cannot successfully claim the same prompt.
 */
export class TriggerPromptChat {
  /**
   * @param {object} socket
   *   Registered SocketLib module used for GM-authoritative operations.
   */
  constructor(socket) {
    this.socket = socket;
  }

  /**
   * Creates a private prompt card for every eligible recipient.
   *
   * The message flag is the durable record of the available power choices and
   * its deadline; rendered HTML is only a client-side view of that state.
   *
   * @param {{trigger: object, actor: Actor, assignments: object[], context: object, recipientIds: string[]}} prompt
   *   Resolved prompt data prepared by the combat dispatcher.
   * @returns {Promise<void>}
   */
  async create({ trigger, actor, assignments, context, recipientIds }) {
    const choices = assignments.map(assignment => `<button data-trigger-prompt-action="${TRIGGER_PROMPT_ACTION.USE}" data-item-id="${assignment.item.id}">${foundry.utils.escapeHTML(assignment.item.name)}</button>`).join("");
    const expiresAt = Date.now() + TRIGGER_PROMPT_TIMEOUT_MS;
    const message = await ChatMessage.create({
      whisper: recipientIds,
      flavor: `<b>${foundry.utils.escapeHTML(trigger.label)}</b>`,
      content: `<p>${foundry.utils.escapeHTML(context.detail)}</p><div class="${TRIGGER_PROMPT_UI.PROMPT_ACTIONS_CLASS}">${choices}<button data-trigger-prompt-action="${TRIGGER_PROMPT_ACTION.DISMISS}">${TRIGGER_PROMPT_UI.DISMISS_LABEL} (10)</button></div>`,
      flags: { [TRIGGER_PROMPT_FLAG]: { triggerId: trigger.id, actorId: actor.id, choices: assignments.map(assignment => ({ assignmentId: assignment.id, itemId: assignment.item.id })), recipientIds, used: false, expiresAt } },
    });
    setTimeout(() => this.socket.executeAsGM(TRIGGER_SOCKET_ACTION.EXPIRE_PROMPT, message.id)
      .catch(error => Logger.error("Failed to expire trigger prompt", { messageId: message.id, error: error.message })), TRIGGER_PROMPT_TIMEOUT_MS);
  }

  /**
   * Binds controls only for a recipient of an unclaimed prompt message.
   *
   * @param {ChatMessage} message
   * @param {JQuery} html
   */
  bind(message, html) {
    const prompt = message.flags?.[TRIGGER_PROMPT_FLAG];
    if (!prompt?.recipientIds?.includes(game.user.id)) {
      return;
    }
    if (prompt.used) {
      html.find("[data-trigger-prompt-action]").remove();
      return;
    }
    this.#bindExpiryCountdown(html, prompt.expiresAt);
    html.find(`[data-trigger-prompt-action='${TRIGGER_PROMPT_ACTION.USE}']`).on("click", async event => {
      event.preventDefault();
      await this.#use(message, event.currentTarget.dataset.itemId ?? prompt.itemId);
    });
    html.find(`[data-trigger-prompt-action='${TRIGGER_PROMPT_ACTION.DISMISS}']`).on("click", async event => {
      event.preventDefault();
      await this.socket.executeAsGM("deleteMessage", message.id);
    });
  }

  /**
   * Claims a prompt through the GM, then starts the selected actor power.
   *
   * @param {ChatMessage} message
   * @param {string} itemId
   *   ID of one power offered by the message.
   * @returns {Promise<void>}
   */
  async #use(message, itemId) {
    const prompt = await this.socket.executeAsGM(TRIGGER_SOCKET_ACTION.CLAIM_PROMPT, message.id, itemId);
    if (!prompt) {
      return;
    }
    const actor = game.actors.get(prompt.actorId);
    const item = actor?.items.get(prompt.itemId);
    if (!item?.roll) {
      Logger.warn("Selected trigger prompt item cannot create a chat card", { messageId: message.id, actorId: prompt.actorId, itemId: prompt.itemId });
      return;
    }

    if (item.type === "power" && actor.usePower) {
      await actor.usePower(item, { configureDialog: false });
      return;
    }

    await item.roll({ configureDialog: false });
  }

  /**
   * Displays the prompt's remaining response time in the Ignore button.
   *
   * @param {JQuery} html
   *   Rendered chat-card element.
   * @param {number} expiresAt
   *   Epoch timestamp at which the prompt expires.
   */
  #bindExpiryCountdown(html, expiresAt) {
    if (!Number.isFinite(expiresAt)) {
      return;
    }
    const dismiss = html.find(`[data-trigger-prompt-action='${TRIGGER_PROMPT_ACTION.DISMISS}']`);
    const update = () => {
      const seconds = Math.max(0, Math.ceil((expiresAt - Date.now()) / 1000));
      dismiss.text(`${TRIGGER_PROMPT_UI.DISMISS_LABEL} (${seconds})`);
      return seconds;
    };
    if (update() === 0) {
      return;
    }
    const countdown = setInterval(() => {
      if (update() === 0) {
        clearInterval(countdown);
      }
    }, 250);
  }
}

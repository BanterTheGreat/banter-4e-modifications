import { Logger } from "../../shared/logger.js";
import { TRIGGER_PROMPT_ACTION, TRIGGER_PROMPT_FLAG, TRIGGER_PROMPT_UI, TRIGGER_SOCKET_ACTION } from "./constants.js";

/** Owns private trigger-prompt message creation and chat-card interaction. */
export class TriggerPromptChat {
  /** @param {object} socket */
  constructor(socket) {
    this.socket = socket;
  }

  /** @param {{trigger: object, actor: Actor, assignments: object[], context: object, recipientIds: string[]}} prompt */
  async create({ trigger, actor, assignments, context, recipientIds }) {
    const choices = assignments.map(assignment => `<button data-trigger-prompt-action="${TRIGGER_PROMPT_ACTION.USE}" data-item-id="${assignment.item.id}">${foundry.utils.escapeHTML(assignment.item.name)}</button>`).join("");
    await ChatMessage.create({
      whisper: recipientIds,
      flavor: `<b>${foundry.utils.escapeHTML(trigger.label)}</b>`,
      content: `<p>${foundry.utils.escapeHTML(context.detail)}</p><div class="${TRIGGER_PROMPT_UI.PROMPT_ACTIONS_CLASS}">${choices}<button data-trigger-prompt-action="${TRIGGER_PROMPT_ACTION.DISMISS}">${TRIGGER_PROMPT_UI.DISMISS_LABEL}</button></div>`,
      flags: { [TRIGGER_PROMPT_FLAG]: { triggerId: trigger.id, actorId: actor.id, choices: assignments.map(assignment => ({ assignmentId: assignment.id, itemId: assignment.item.id })), recipientIds, used: false } },
    });
  }

  /** @param {ChatMessage} message @param {JQuery} html */
  bind(message, html) {
    const prompt = message.flags?.[TRIGGER_PROMPT_FLAG];
    if (!prompt?.recipientIds?.includes(game.user.id)) {
      return;
    }
    if (prompt.used) {
      html.find("[data-trigger-prompt-action]").remove();
      return;
    }
    html.find(`[data-trigger-prompt-action='${TRIGGER_PROMPT_ACTION.USE}']`).on("click", async event => {
      event.preventDefault();
      await this.#use(message, event.currentTarget.dataset.itemId ?? prompt.itemId);
    });
    html.find(`[data-trigger-prompt-action='${TRIGGER_PROMPT_ACTION.DISMISS}']`).on("click", async event => {
      event.preventDefault();
      await this.socket.executeAsGM("deleteMessage", message.id);
    });
  }

  /** @param {ChatMessage} message @param {string} itemId */
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
}

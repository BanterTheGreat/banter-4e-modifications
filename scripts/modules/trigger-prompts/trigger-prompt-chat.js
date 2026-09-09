import { Logger } from "../../shared/logger.js";
import { TRIGGER_PROMPT_ACTION, TRIGGER_PROMPT_FLAG, TRIGGER_PROMPT_UI, TRIGGER_SOCKET_ACTION } from "./constants.js";

/** Owns private trigger-prompt message creation and chat-card interaction. */
export class TriggerPromptChat {
  /** @param {object} socket */
  constructor(socket) {
    this.socket = socket;
  }

  /** @param {{trigger: object, actor: Actor, item: Item, context: object, recipientIds: string[]}} prompt */
  async create({ trigger, actor, item, context, recipientIds }) {
    await ChatMessage.create({
      whisper: recipientIds,
      flavor: `<b>${foundry.utils.escapeHTML(trigger.label)}</b>`,
      content: `<p>${foundry.utils.escapeHTML(context.detail)}</p><button data-trigger-prompt-action="${TRIGGER_PROMPT_ACTION.USE}">${foundry.utils.escapeHTML(item.name)}</button><button data-trigger-prompt-action="${TRIGGER_PROMPT_ACTION.DISMISS}">${TRIGGER_PROMPT_UI.DISMISS_LABEL}</button>`,
      flags: { [TRIGGER_PROMPT_FLAG]: { triggerId: trigger.id, actorId: actor.id, itemId: item.id, recipientIds, used: false } },
    });
  }

  /** @param {ChatMessage} message @param {JQuery} html */
  bind(message, html) {
    const prompt = message.flags?.[TRIGGER_PROMPT_FLAG];
    if (!prompt?.recipientIds?.includes(game.user.id)) {
      return;
    }
    if (prompt.used) {
      html.find("[data-trigger-prompt-action]").prop("disabled", true);
      return;
    }
    html.find(`[data-trigger-prompt-action='${TRIGGER_PROMPT_ACTION.USE}']`).on("click", async event => {
      event.preventDefault();
      await this.#use(message);
    });
    html.find(`[data-trigger-prompt-action='${TRIGGER_PROMPT_ACTION.DISMISS}']`).on("click", async event => {
      event.preventDefault();
      await this.socket.executeAsGM("deleteMessage", message.id);
    });
  }

  /** @param {ChatMessage} message */
  async #use(message) {
    const prompt = await this.socket.executeAsGM(TRIGGER_SOCKET_ACTION.CLAIM_PROMPT, message.id);
    if (!prompt) {
      return;
    }
    const item = game.actors.get(prompt.actorId)?.items.get(prompt.itemId);
    if (!item?.toChat) {
      Logger.warn("Selected trigger prompt item cannot post a chat card", { messageId: message.id, actorId: prompt.actorId, itemId: prompt.itemId });
      return;
    }
    await item.toChat();
  }
}

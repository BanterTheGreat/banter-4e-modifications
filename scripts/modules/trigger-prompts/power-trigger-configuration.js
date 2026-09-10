import { ActorTriggerConfiguration } from "./actor-trigger-configuration.js";
import { TRIGGER_PROMPT_UI } from "./constants.js";

/** Adds the per-power trigger assignment control to supported item sheets. */
export class PowerTriggerConfiguration {
  /** @param {object} app @param {object[]} buttons */
  static onGetItemSheetHeaderButtons(app, buttons) {
    const item = app.item ?? app.document;
    if (!PowerTriggerConfiguration.#canConfigure(item)) {
      return;
    }
    buttons.unshift({ class: TRIGGER_PROMPT_UI.ITEM_CONFIG_CLASS, icon: "fas fa-bolt", label: "Triggers", onclick: () => ActorTriggerConfiguration.showItem(item) });
  }

  /** @param {object} app @param {object[]} controls */
  static onGetHeaderControlsApplicationV2(app, controls) {
    const item = app.document;
    if (!PowerTriggerConfiguration.#canConfigure(item) || controls.some(control => control.action === TRIGGER_PROMPT_UI.ITEM_CONFIG_ACTION)) {
      return;
    }
    controls.unshift({ label: "Triggers", icon: "fas fa-bolt", class: TRIGGER_PROMPT_UI.ITEM_CONFIG_CLASS, action: TRIGGER_PROMPT_UI.ITEM_CONFIG_ACTION, onClick: () => ActorTriggerConfiguration.showItem(item) });
  }

  /** @param {Item} item @param {object} options @param {string} userId */
  static async onDeleteItem(item, options, userId) {
    if (userId === game.user.id) {
      await ActorTriggerConfiguration.removeAssignmentsForItem(item);
    }
  }

  /** @param {Item} item */
  static #canConfigure(item) {
    const actor = item?.parent;
    return item?.documentName === "Item" && item.type === "power" && actor?.documentName === "Actor" && (game.user.isGM || actor.isOwner);
  }
}

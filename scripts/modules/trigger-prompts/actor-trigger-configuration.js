import { MODULE_NAME } from "../../shared/globals.js";
import { TRIGGER_CONFIGURATION_FLAG, TRIGGER_PROMPT_UI } from "./constants.js";
import { TRIGGERS } from "./trigger-registry.js";

/** Owns actor flag access and the actor-sheet trigger configuration dialog. */
export class ActorTriggerConfiguration {
  /** @param {Actor} actor @param {object} trigger */
  static isEnabled(actor, trigger) {
    const entry = ActorTriggerConfiguration.#entries(actor)[trigger.id];
    return !trigger.configurable || Boolean(entry?.enabled);
  }

  /** @param {Actor} actor @param {object} trigger */
  static resolveAbility(actor, trigger) {
    const entry = ActorTriggerConfiguration.#entries(actor)[trigger.id];
    return actor.items.get(entry?.itemId) ?? actor.items.find(item => item.name?.toLowerCase() === trigger.defaultAbilityName.toLowerCase());
  }

  /** @param {Actor} actor */
  static show(actor) {
    const config = ActorTriggerConfiguration.#entries(actor);
    const itemOptions = [...actor.items].map(item => `<option value="${item.id}">${foundry.utils.escapeHTML(item.name)}</option>`).join("");
    const rows = TRIGGERS.map(trigger => ActorTriggerConfiguration.#row(trigger, config[trigger.id], itemOptions)).join("");

    new Dialog({
      title: `${actor.name}: Trigger prompts`,
      content: `<form class="${TRIGGER_PROMPT_UI.CONFIG_CLASS}">${rows}</form>`,
      buttons: { save: { label: "Save", callback: html => ActorTriggerConfiguration.#save(actor, html.find("form")[0]) } },
      default: "save",
      render: html => ActorTriggerConfiguration.#selectConfiguredItems(html, config),
    }).render(true);
  }

  /** @param {Actor} actor */
  static #entries(actor) {
    return actor.getFlag(MODULE_NAME, TRIGGER_CONFIGURATION_FLAG) ?? {};
  }

  /** @param {object} trigger @param {object} entry @param {string} itemOptions */
  static #row(trigger, entry = {}, itemOptions) {
    const enabled = entry.enabled ? "checked" : "";
    const toggle = trigger.configurable ? `<label><input type="checkbox" name="${trigger.id}.enabled" ${enabled}> Enable</label>` : "Always active";
    const options = `<option value="">Use default: ${trigger.defaultAbilityName}</option>${itemOptions}`;
    return `<div class="form-group"><label>${trigger.label}</label>${toggle}<select name="${trigger.id}.itemId">${options}</select><p class="hint">${trigger.description}</p></div>`;
  }

  /** @param {Actor} actor @param {HTMLFormElement} form */
  static async #save(actor, form) {
    const data = new FormData(form);
    const config = {};
    TRIGGERS.forEach(trigger => {
      config[trigger.id] = { enabled: trigger.configurable ? data.has(`${trigger.id}.enabled`) : true, itemId: data.get(`${trigger.id}.itemId`) || null };
    });
    await actor.setFlag(MODULE_NAME, TRIGGER_CONFIGURATION_FLAG, config);
  }

  /** @param {JQuery} html @param {object} config */
  static #selectConfiguredItems(html, config) {
    TRIGGERS.forEach(trigger => {
      const itemId = config[trigger.id]?.itemId;
      if (itemId) {
        html.find(`[name='${trigger.id}.itemId']`).val(itemId);
      }
    });
  }
}

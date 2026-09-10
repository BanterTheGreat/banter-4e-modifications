import { MODULE_NAME } from "../../shared/globals.js";
import { ABILITY_SELECTION, TRIGGER_CONFIGURATION_FLAG, TRIGGER_PROMPT_UI } from "./constants.js";
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
    const selection = entry?.abilitySelection ?? entry?.itemId ?? trigger.defaultAbilitySelection;
    if (selection.startsWith(ABILITY_SELECTION.ITEM_PREFIX)) {
      const item = actor.items.get(selection.slice(ABILITY_SELECTION.ITEM_PREFIX.length));
      return item?.type === "power" ? item : undefined;
    }

    // Legacy configurations stored an unprefixed item ID.
    if (entry?.itemId && !entry?.abilitySelection) {
      const item = actor.items.get(entry.itemId);
      return item?.type === "power" ? item : undefined;
    }

    return actor.items.find(item => ActorTriggerConfiguration.#matchesSelection(item, selection));
  }

  /** @param {Actor} actor @param {object} trigger */
  static rangeSquares(actor, trigger) {
    const range = ActorTriggerConfiguration.#entries(actor)[trigger.id]?.rangeSquares;
    return Number.isFinite(range) && range >= 0 ? range : trigger.defaultRangeSquares ?? null;
  }

  /** @param {Actor} actor */
  static show(actor) {
    const config = ActorTriggerConfiguration.#entries(actor);
    const itemOptions = actor.items
      .filter(item => item.type === "power")
      .map(item => `<option value="${ABILITY_SELECTION.ITEM_PREFIX}${item.id}">${foundry.utils.escapeHTML(item.name)}</option>`)
      .join("");
    const rows = TRIGGERS.map(trigger => ActorTriggerConfiguration.#row(actor, trigger, config[trigger.id], itemOptions)).join("");

    new Dialog({
      title: `${actor.name}: Trigger prompts`,
      content: `<form class="${TRIGGER_PROMPT_UI.CONFIG_CLASS}">${rows}</form>`,
      buttons: { save: { label: "Save", callback: html => ActorTriggerConfiguration.#save(actor, html.find("form")[0]) } },
      default: "save",
      render: html => ActorTriggerConfiguration.#selectConfiguredItems(html, config),
    }, { width: 640 }).render(true);
  }

  /** @param {Actor} actor */
  static #entries(actor) {
    return actor.getFlag(MODULE_NAME, TRIGGER_CONFIGURATION_FLAG) ?? {};
  }

  /** @param {Actor} actor @param {object} trigger @param {object} entry @param {string} itemOptions */
  static #row(actor, trigger, entry = {}, itemOptions) {
    const enabled = entry.enabled ? "checked" : "";
    const toggle = trigger.configurable
      ? `<input class="trigger-prompts-config__enabled" type="checkbox" name="${trigger.id}.enabled" ${enabled} title="Enable ${trigger.label}" aria-label="Enable ${trigger.label}">`
      : "";
    const options = `<option value="${ABILITY_SELECTION.BASIC_ATTACKS}">Basic Attacks</option><option value="${ABILITY_SELECTION.OPPORTUNITY_ATTACKS}">Opportunity Attacks</option>${itemOptions}`;
    const range = trigger.defaultRangeSquares === undefined
      ? ""
      : `<label class="trigger-prompts-config__range">Range <input type="number" name="${trigger.id}.rangeSquares" min="0" step="1" value="${ActorTriggerConfiguration.rangeSquares(actor, trigger)}"> squares</label>`;
    return `<section class="trigger-prompts-config__row">
      <div class="trigger-prompts-config__details">
        <strong>${trigger.label}</strong>
        <p class="hint">${trigger.description}</p>
      </div>
      <div class="trigger-prompts-config__controls">
        ${toggle}
        <select name="${trigger.id}.abilitySelection">${options}</select>
        ${range}
      </div>
    </section>`;
  }

  /** @param {Item} item @param {string} selection */
  static #matchesSelection(item, selection) {
    if (item.type !== "power") {
      return false;
    }
    if (selection === ABILITY_SELECTION.BASIC_ATTACKS) {
      return Boolean(item.system?.attack?.isBasic);
    }
    if (selection === ABILITY_SELECTION.OPPORTUNITY_ATTACKS) {
      return Boolean(item.system?.attack?.isOpp);
    }
    return false;
  }

  /** @param {Actor} actor @param {HTMLFormElement} form */
  static async #save(actor, form) {
    const data = new FormData(form);
    const config = {};
    TRIGGERS.forEach(trigger => {
      const rangeSquares = data.get(`${trigger.id}.rangeSquares`);
      config[trigger.id] = {
        enabled: trigger.configurable ? data.has(`${trigger.id}.enabled`) : true,
        abilitySelection: data.get(`${trigger.id}.abilitySelection`) || trigger.defaultAbilitySelection,
        ...(trigger.defaultRangeSquares === undefined ? {} : { rangeSquares: rangeSquares === "" ? trigger.defaultRangeSquares : Number(rangeSquares) }),
      };
    });
    await actor.setFlag(MODULE_NAME, TRIGGER_CONFIGURATION_FLAG, config);
  }

  /** @param {JQuery} html @param {object} config */
  static #selectConfiguredItems(html, config) {
    TRIGGERS.forEach(trigger => {
      const entry = config[trigger.id];
      const selection = entry?.abilitySelection
        ?? (entry?.itemId ? `${ABILITY_SELECTION.ITEM_PREFIX}${entry.itemId}` : trigger.defaultAbilitySelection);
      html.find(`[name='${trigger.id}.abilitySelection']`).val(selection);
    });
  }
}

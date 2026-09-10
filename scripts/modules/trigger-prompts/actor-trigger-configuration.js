import { MODULE_NAME } from "../../shared/globals.js";
import { ABILITY_SELECTION, TRIGGER_CONFIGURATION_FLAG, TRIGGER_ID, TRIGGER_PROMPT_UI } from "./constants.js";
import { TRIGGERS } from "./trigger-registry.js";

/** Owns actor-level trigger settings, assignments, and their summary dialog. */
export class ActorTriggerConfiguration {
  /** @param {Actor} actor @param {object} trigger @param {object} context */
  static assignmentsFor(actor, trigger, context = {}) {
    if (trigger.id === TRIGGER_ID.OPPORTUNITY_ATTACK) {
      if (!ActorTriggerConfiguration.opportunityAttacksEnabled(actor)) {
        return [];
      }
      return actor.items.filter(item => item.type === "power" && item.system?.attack?.isOpp)
        .map(item => ({ id: `opportunity:${item.id}`, itemId: item.id, triggerId: trigger.id, parameters: {}, item }));
    }
    return ActorTriggerConfiguration.assignments(actor)
      .filter(assignment => assignment.triggerId === trigger.id)
      .filter(assignment => ActorTriggerConfiguration.#matchesParameters(assignment, trigger, context));
  }

  /** @param {Actor} actor */
  static assignments(actor) {
    return ActorTriggerConfiguration.#normalized(actor).assignments
      .map(assignment => ({ ...assignment, item: actor.items.get(assignment.itemId) }))
      .filter(assignment => assignment.item?.type === "power");
  }

  /** @param {Actor} actor */
  static opportunityAttacksEnabled(actor) {
    return ActorTriggerConfiguration.#normalized(actor).opportunityAttack.enabled;
  }

  /** @param {Actor} actor */
  static show(actor) {
    const checked = ActorTriggerConfiguration.opportunityAttacksEnabled(actor) ? "checked" : "";
    const opportunityPowers = actor.items.filter(item => item.type === "power" && item.system?.attack?.isOpp);
    const opportunitySummary = opportunityPowers.length
      ? `<ul>${opportunityPowers.map(item => `<li>${foundry.utils.escapeHTML(item.name)}</li>`).join("")}</ul>`
      : `<p class="hint">No powers are marked as opportunity attacks.</p>`;
    const summary = TRIGGERS.filter(trigger => trigger.id !== TRIGGER_ID.OPPORTUNITY_ATTACK)
      .map(trigger => ActorTriggerConfiguration.#summary(actor, trigger)).filter(Boolean).join("");
    const content = `<form class="${TRIGGER_PROMPT_UI.CONFIG_CLASS}">
      <section class="trigger-prompts-config__row">
        <div class="trigger-prompts-config__details"><strong>Opportunity Attacks</strong><p class="hint">Offer every power marked by DnD4e as an opportunity attack.</p>${opportunitySummary}</div>
        <label><input type="checkbox" name="opportunityAttack.enabled" ${checked}> Enabled</label>
      </section>
      <h3>Power trigger assignments</h3>
      <div class="trigger-prompts-config__summary">${summary || `<p class="hint">No powers have trigger assignments.</p>`}</div>
    </form>`;
    new Dialog({
      title: `${actor.name}: Trigger prompts`, content,
      buttons: { save: { label: "Save", callback: html => ActorTriggerConfiguration.#saveActor(actor, html.find("form")[0]) } }, default: "save",
    }, { width: 640 }).render(true);
  }

  /** @param {Item} item */
  static showItem(item) {
    const actor = item.parent;
    if (!actor || actor.documentName !== "Actor" || item.type !== "power") {
      return;
    }
    const assignments = new Map(ActorTriggerConfiguration.assignments(actor)
      .filter(assignment => assignment.itemId === item.id).map(assignment => [assignment.triggerId, assignment]));
    const rows = TRIGGERS.filter(trigger => trigger.id !== TRIGGER_ID.OPPORTUNITY_ATTACK)
      .map(trigger => ActorTriggerConfiguration.#itemRow(trigger, assignments.get(trigger.id))).join("");
    const triggerText = ActorTriggerConfiguration.triggerText(item);
    const reference = triggerText
      ? `<p class="trigger-prompts-config__reference"><strong>Power trigger:</strong> ${foundry.utils.escapeHTML(triggerText)}</p>`
      : `<p class="hint">This power has no trigger line in its DnD4e data.</p>`;
    new Dialog({
      title: `${item.name}: Trigger prompts`, content: `<form class="${TRIGGER_PROMPT_UI.CONFIG_CLASS}">${reference}${rows}</form>`,
      buttons: { save: { label: "Save", callback: html => ActorTriggerConfiguration.#saveItem(item, html.find("form")[0]) } }, default: "save",
    }, { width: 640 }).render(true);
  }

  /** @param {Item} item */
  static triggerText(item) {
    const trigger = item.system?.trigger;
    return typeof trigger === "string" ? trigger : trigger?.value ?? trigger?.text ?? "";
  }

  /** @param {Item} item */
  static async removeAssignmentsForItem(item) {
    const actor = item.parent;
    if (!actor || actor.documentName !== "Actor") {
      return;
    }
    const configuration = ActorTriggerConfiguration.#normalized(actor);
    const assignments = configuration.assignments.filter(assignment => assignment.itemId !== item.id);
    if (assignments.length !== configuration.assignments.length) {
      await actor.setFlag(MODULE_NAME, TRIGGER_CONFIGURATION_FLAG, { ...configuration, assignments });
    }
  }

  /** @param {Actor} actor @param {object} trigger */
  static #summary(actor, trigger) {
    const assignments = ActorTriggerConfiguration.assignments(actor).filter(assignment => assignment.triggerId === trigger.id);
    if (!assignments.length) {
      return "";
    }
    const rows = assignments.map(assignment => {
      const rangeSquares = assignment.parameters?.rangeSquares ?? trigger.defaultRangeSquares;
      const range = trigger.defaultRangeSquares === undefined ? "" : ` — Range ${rangeSquares} squares`;
      const triggerText = ActorTriggerConfiguration.triggerText(assignment.item);
      return `<li><strong>${foundry.utils.escapeHTML(assignment.item.name)}</strong>${range}${triggerText ? `<small>${foundry.utils.escapeHTML(triggerText)}</small>` : ""}</li>`;
    }).join("");
    return `<section><h4>${foundry.utils.escapeHTML(trigger.label)}</h4><ul>${rows}</ul></section>`;
  }

  /** @param {object} trigger @param {object} assignment */
  static #itemRow(trigger, assignment) {
    const checked = assignment ? "checked" : "";
    const range = trigger.defaultRangeSquares === undefined ? "" : `<label class="trigger-prompts-config__range">Range <input type="number" name="${trigger.id}.rangeSquares" min="0" step="1" value="${assignment?.parameters?.rangeSquares ?? trigger.defaultRangeSquares}"> squares</label>`;
    return `<section class="trigger-prompts-config__row">
      <div class="trigger-prompts-config__details"><strong>${foundry.utils.escapeHTML(trigger.label)}</strong><p class="hint">${foundry.utils.escapeHTML(trigger.description)}</p></div>
      <div class="trigger-prompts-config__controls"><label><input type="checkbox" name="${trigger.id}.enabled" ${checked}> Assigned</label>${range}</div>
    </section>`;
  }

  /** @param {Actor} actor @param {HTMLFormElement} form */
  static async #saveActor(actor, form) {
    const configuration = ActorTriggerConfiguration.#normalized(actor);
    await actor.setFlag(MODULE_NAME, TRIGGER_CONFIGURATION_FLAG, { ...configuration, opportunityAttack: { enabled: new FormData(form).has("opportunityAttack.enabled") } });
  }

  /** @param {Item} item @param {HTMLFormElement} form */
  static async #saveItem(item, form) {
    const actor = item.parent;
    const configuration = ActorTriggerConfiguration.#normalized(actor);
    const existing = new Map(configuration.assignments.filter(assignment => assignment.itemId === item.id).map(assignment => [assignment.triggerId, assignment]));
    const data = new FormData(form);
    const itemAssignments = TRIGGERS
      .filter(trigger => trigger.id !== TRIGGER_ID.OPPORTUNITY_ATTACK && data.has(`${trigger.id}.enabled`))
      .map(trigger => {
        const range = data.get(`${trigger.id}.rangeSquares`);
        const parsedRange = Number(range);
        return {
          id: existing.get(trigger.id)?.id ?? foundry.utils.randomID(), itemId: item.id, triggerId: trigger.id,
          parameters: trigger.defaultRangeSquares === undefined ? {} : { rangeSquares: range === "" || !Number.isFinite(parsedRange) ? trigger.defaultRangeSquares : Math.max(0, parsedRange) },
        };
      });
    await actor.setFlag(MODULE_NAME, TRIGGER_CONFIGURATION_FLAG, {
      ...configuration,
      assignments: [...configuration.assignments.filter(assignment => assignment.itemId !== item.id), ...itemAssignments],
    });
  }

  /** @param {object} assignment @param {object} trigger @param {object} context */
  static #matchesParameters(assignment, trigger, context) {
    if (trigger.defaultRangeSquares === undefined || !Number.isFinite(context.distanceSquares)) {
      return true;
    }
    const range = assignment.parameters?.rangeSquares;
    return context.distanceSquares <= (Number.isFinite(range) && range >= 0 ? range : trigger.defaultRangeSquares);
  }

  /** @param {Actor} actor */
  static #normalized(actor) {
    const stored = actor.getFlag(MODULE_NAME, TRIGGER_CONFIGURATION_FLAG) ?? {};
    if (Array.isArray(stored.assignments)) {
      return { opportunityAttack: { enabled: stored.opportunityAttack?.enabled !== false }, assignments: stored.assignments };
    }
    const assignments = [];
    for (const trigger of TRIGGERS.filter(candidate => candidate.id !== TRIGGER_ID.OPPORTUNITY_ATTACK)) {
      const entry = stored[trigger.id];
      if (!entry?.enabled) {
        continue;
      }
      const selection = entry.abilitySelection ?? entry.itemId;
      let items = [];
      if (selection === ABILITY_SELECTION.BASIC_ATTACKS) {
        items = actor.items.filter(item => item.type === "power" && item.system?.attack?.isBasic);
      } else if (selection === ABILITY_SELECTION.OPPORTUNITY_ATTACKS) {
        items = actor.items.filter(item => item.type === "power" && item.system?.attack?.isOpp);
      } else {
        const itemId = selection?.startsWith(ABILITY_SELECTION.ITEM_PREFIX) ? selection.slice(ABILITY_SELECTION.ITEM_PREFIX.length) : selection;
        const item = actor.items.get(itemId);
        items = item?.type === "power" ? [item] : [];
      }
      for (const item of items) {
        assignments.push({ id: foundry.utils.randomID(), itemId: item.id, triggerId: trigger.id, parameters: trigger.defaultRangeSquares === undefined ? {} : { rangeSquares: entry.rangeSquares ?? trigger.defaultRangeSquares } });
      }
    }
    return { opportunityAttack: { enabled: stored[TRIGGER_ID.OPPORTUNITY_ATTACK]?.enabled !== false }, assignments };
  }
}

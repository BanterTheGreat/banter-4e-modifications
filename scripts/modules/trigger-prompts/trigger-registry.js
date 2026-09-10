import { OpportunityAttackTrigger } from "./triggers/opportunity-attack-trigger.js";
import { EnemyMissTrigger } from "./triggers/enemy-miss-trigger.js";
import { EnemyMissSelfTrigger } from "./triggers/enemy-miss-self-trigger.js";
import { EnemyHitSelfTrigger } from "./triggers/enemy-hit-self-trigger.js";
import { MarkedCreatureBloodiedTrigger } from "./triggers/marked-creature-bloodied-trigger.js";
import { MarkedCreatureMovesAdjacentTrigger } from "./triggers/marked-creature-moves-adjacent-trigger.js";

/**
 * All trigger definitions supported by the submodule.
 *
 * Registry order determines the order in which attack-result prompts are
 * evaluated and delivered.
 *
 * @type {Array<import("./triggers/combat-trigger.js").CombatTrigger>}
 */
export const TRIGGERS = [
  new OpportunityAttackTrigger(),
  new EnemyMissSelfTrigger(),
  new EnemyMissTrigger(),
  new EnemyHitSelfTrigger(),
  new MarkedCreatureBloodiedTrigger(),
  new MarkedCreatureMovesAdjacentTrigger(),
];

/**
 * Looks up a trigger definition by its persisted identifier.
 *
 * @param {string} id
 *   Stable trigger identifier from {@link TRIGGER_ID}.
 * @returns {import("./triggers/combat-trigger.js").CombatTrigger|undefined}
 *   The registered definition, when the ID is supported.
 */
export function getTrigger(id) {
  return TRIGGERS.find(trigger => trigger.id === id);
}

import { OpportunityAttackTrigger } from "./triggers/opportunity-attack-trigger.js";
import { EnemyMissTrigger } from "./triggers/enemy-miss-trigger.js";

/** @type {Array<object>} */
export const TRIGGERS = [
  new OpportunityAttackTrigger(),
  new EnemyMissTrigger(),
];

/**
 * @param {string} id
 * @returns {object|undefined}
 */
export function getTrigger(id) {
  return TRIGGERS.find(trigger => trigger.id === id);
}

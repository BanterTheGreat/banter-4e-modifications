import { OpportunityAttackTrigger } from "./triggers/opportunity-attack-trigger.js";
import { EnemyMissTrigger } from "./triggers/enemy-miss-trigger.js";
import { EnemyMissSelfTrigger } from "./triggers/enemy-miss-self-trigger.js";
import { EnemyHitSelfTrigger } from "./triggers/enemy-hit-self-trigger.js";

/** @type {Array<object>} */
export const TRIGGERS = [
  new OpportunityAttackTrigger(),
  new EnemyMissSelfTrigger(),
  new EnemyMissTrigger(),
  new EnemyHitSelfTrigger(),
];

/**
 * @param {string} id
 * @returns {object|undefined}
 */
export function getTrigger(id) {
  return TRIGGERS.find(trigger => trigger.id === id);
}

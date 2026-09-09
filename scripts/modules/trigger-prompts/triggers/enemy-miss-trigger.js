import { CombatTrigger } from "./combat-trigger.js";
import { DEFAULT_ABILITY_NAME, TRIGGER_EVENT_TYPE, TRIGGER_ID } from "../constants.js";

/**
 * Detects an enemy missing a combatant and finds their eligible allies.
 */
export class EnemyMissTrigger extends CombatTrigger {
  constructor() {
    super({
      id: TRIGGER_ID.ENEMY_MISSES_ALLY,
      label: "Enemy misses you or an ally",
      configurable: true,
      defaultAbilityName: DEFAULT_ABILITY_NAME.MELEE_BASIC_ATTACK,
      description: "An enemy misses this actor or an allied combatant.",
    });
  }

  /** @inheritdoc */
  evaluate(event, services) {
    if (event.type !== TRIGGER_EVENT_TYPE.MISS) {
      return [];
    }

    const attacker = services.getToken(event.attacker.sceneId, event.attacker.tokenId);
    const missedTarget = services.getToken(event.target.sceneId, event.target.tokenId);
    if (!attacker || !missedTarget || !services.areHostile(attacker, missedTarget)) {
      return [];
    }

    return services.combatants
      .map(combatant => services.getToken(combatant.sceneId, combatant.tokenId))
      .filter(candidate => candidate && services.areAllies(candidate, missedTarget))
      .map(candidate => ({
        actor: candidate.actor,
        sourceName: attacker.name,
        detail: `${attacker.name} missed ${missedTarget.name}.`,
      }));
  }
}

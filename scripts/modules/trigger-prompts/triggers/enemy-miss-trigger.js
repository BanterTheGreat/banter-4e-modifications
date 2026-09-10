import { CombatTrigger } from "./combat-trigger.js";
import { ABILITY_SELECTION, TRIGGER_EVENT_TYPE, TRIGGER_ID } from "../constants.js";

/**
 * Detects an enemy missing a combatant and finds nearby eligible allies.
 */
export class EnemyMissTrigger extends CombatTrigger {
  constructor() {
    super({
      id: TRIGGER_ID.ENEMY_MISSES_ALLY,
      label: "Enemy misses you or an ally",
      configurable: true,
      defaultAbilitySelection: ABILITY_SELECTION.BASIC_ATTACKS,
      defaultRangeSquares: 10,
      description: "An enemy misses this actor or an allied combatant within the configured range.",
    });
  }

  /** @inheritdoc */
  evaluate(event, services) {
    if (event.type !== TRIGGER_EVENT_TYPE.ATTACK_RESULT || event.outcome !== "miss") {
      return [];
    }

    const attacker = services.getToken(event.attacker.sceneId, event.attacker.tokenId);
    const missedTarget = services.getToken(event.target.sceneId, event.target.tokenId);
    if (!attacker || !missedTarget || !services.areHostile(attacker, missedTarget)) {
      return [];
    }

    return services.combatants
      .map(combatant => services.getToken(combatant.sceneId, combatant.tokenId))
      .filter(candidate => candidate && services.areAllies(candidate, missedTarget) && services.isWithinRange(candidate, missedTarget, services.rangeSquares(candidate.actor, this)))
      .map(candidate => ({
        actor: candidate.actor,
        sourceName: attacker.name,
        detail: `${attacker.name} missed ${missedTarget.name}.`,
      }));
  }
}

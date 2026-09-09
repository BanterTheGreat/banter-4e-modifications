import { CombatTrigger } from "./combat-trigger.js";
import { DEFAULT_ABILITY_NAME, TRIGGER_EVENT_TYPE, TRIGGER_ID } from "../constants.js";

/** Detects an enemy missing the configured actor. */
export class EnemyMissSelfTrigger extends CombatTrigger {
  constructor() {
    super({
      id: TRIGGER_ID.ENEMY_MISSES_YOU,
      label: "Enemy misses you",
      configurable: true,
      defaultAbilityName: DEFAULT_ABILITY_NAME.MELEE_BASIC_ATTACK,
      description: "An enemy misses this actor.",
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

    return [{
      actor: missedTarget.actor,
      sourceName: attacker.name,
      detail: `${attacker.name} missed ${missedTarget.name}.`,
    }];
  }
}

import { CombatTrigger } from "./combat-trigger.js";
import { TRIGGER_EVENT_TYPE, TRIGGER_ID } from "../constants.js";

/** Detects an enemy hitting the configured actor. */
export class EnemyHitSelfTrigger extends CombatTrigger {
  constructor() {
    super({
      id: TRIGGER_ID.ENEMY_HITS_YOU,
      label: "Enemy hits you",
      description: "An enemy hits this actor.",
    });
  }

  /** @inheritdoc */
  evaluate(event, services) {
    if (event.type !== TRIGGER_EVENT_TYPE.ATTACK_RESULT || event.outcome !== "hit") {
      return [];
    }

    const attacker = services.getToken(event.attacker.sceneId, event.attacker.tokenId);
    const target = services.getToken(event.target.sceneId, event.target.tokenId);
    if (!attacker || !target || !services.areHostile(attacker, target)) {
      return [];
    }

    return [{
      actor: target.actor,
      sourceName: attacker.name,
      detail: `${attacker.name} hit ${target.name}.`,
    }];
  }
}

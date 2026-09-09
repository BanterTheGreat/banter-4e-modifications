import { CombatTrigger } from "./combat-trigger.js";
import { DEFAULT_ABILITY_NAME, TRIGGER_EVENT_TYPE, TRIGGER_ID } from "../constants.js";

/**
 * Detects hostile movement that begins adjacent to a configured actor.
 */
export class OpportunityAttackTrigger extends CombatTrigger {
  constructor() {
    super({
      id: TRIGGER_ID.OPPORTUNITY_ATTACK,
      label: "Possible opportunity attack",
      configurable: false,
      defaultAbilityName: DEFAULT_ABILITY_NAME.MELEE_BASIC_ATTACK,
      description: "A hostile combatant starts moving adjacent to this actor.",
    });
  }

  /** @inheritdoc */
  evaluate(event, services) {
    if (event.type !== TRIGGER_EVENT_TYPE.MOVEMENT) {
      return [];
    }

    const mover = services.getToken(event.sceneId, event.tokenId);
    if (!mover) {
      return [];
    }

    return services.combatants
      .filter(combatant => combatant.id !== event.combatant.id && combatant.sceneId === event.sceneId)
      .map(combatant => services.getToken(combatant.sceneId, combatant.tokenId))
      .filter(candidate => candidate && services.areHostile(mover, candidate) && services.areAdjacent(mover, candidate))
      .map(candidate => ({
        actor: candidate.actor,
        sourceName: mover.name,
        detail: `${mover.name} started moving adjacent to ${candidate.name}.`,
      }));
  }
}

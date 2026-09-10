import { CombatTrigger } from "./combat-trigger.js";
import { DEFAULT_ABILITY_NAME, TRIGGER_EVENT_TYPE, TRIGGER_ID } from "../constants.js";

/** Detects a marked creature moving while adjacent to its Mark owner. */
export class MarkedCreatureMovesAdjacentTrigger extends CombatTrigger {
  constructor() {
    super({
      id: TRIGGER_ID.MARKED_CREATURE_SHIFTS_ADJACENT,
      label: "Adjacent creature marked by you shifts",
      configurable: true,
      defaultAbilityName: DEFAULT_ABILITY_NAME.MELEE_BASIC_ATTACK,
      description: "A creature carrying a Mark owned by this actor shifts while adjacent to the actor.",
    });
  }

  /** @inheritdoc */
  evaluate(event, services) {
    if (event.type !== TRIGGER_EVENT_TYPE.MOVEMENT) {
      return [];
    }
    const markedToken = services.getToken(event.sceneId, event.tokenId);
    const owner = markedToken && services.markOwner(markedToken);
    if (!markedToken || !owner || !services.movesAdjacent(markedToken, event.destination, owner)) {
      return [];
    }
    return [{ actor: owner.actor, sourceName: markedToken.name, detail: `${markedToken.name}, marked by ${owner.name}, moved while adjacent.` }];
  }
}

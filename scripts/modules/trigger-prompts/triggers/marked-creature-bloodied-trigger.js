import { CombatTrigger } from "./combat-trigger.js";
import { DEFAULT_ABILITY_NAME, TRIGGER_EVENT_TYPE, TRIGGER_ID } from "../constants.js";

/** Detects a creature crossing its bloodied threshold while owned by a Mark. */
export class MarkedCreatureBloodiedTrigger extends CombatTrigger {
  constructor() {
    super({
      id: TRIGGER_ID.MARKED_CREATURE_BLOODIED,
      label: "Creature marked by you becomes bloodied",
      configurable: true,
      defaultAbilityName: DEFAULT_ABILITY_NAME.MELEE_BASIC_ATTACK,
      description: "A creature carrying a Mark owned by this actor becomes bloodied.",
    });
  }

  /** @inheritdoc */
  evaluate(event, services) {
    if (event.type !== TRIGGER_EVENT_TYPE.BLOODIED) {
      return [];
    }
    const marked = services.getToken(event.sceneId, event.tokenId);
    const owner = marked && services.markOwner(marked);
    if (!marked || !owner) {
      return [];
    }
    return [{ actor: owner.actor, sourceName: marked.name, detail: `${marked.name}, marked by ${owner.name}, became bloodied.` }];
  }
}

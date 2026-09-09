/**
 * Base contract for a combat trigger definition.
 *
 * A trigger decides whether an event qualifies and returns actor-specific
 * prompt contexts. TriggerPrompts owns only event dispatch, actor settings,
 * and chat-message delivery.
 */
export class CombatTrigger {
  /** @param {{id: string, label: string, configurable: boolean, defaultAbilityName: string, description: string}} definition */
  constructor(definition) {
    Object.assign(this, definition);
  }

  /**
   * Returns the actor-specific prompts for a combat event.
   *
   * @param {object} event
   * @param {object} services
   * @returns {Array<{actor: Actor, sourceName: string, detail: string}>}
   */
  evaluate(event, services) {
    return [];
  }
}

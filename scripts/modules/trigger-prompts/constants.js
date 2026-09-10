/** Immutable identifiers shared by trigger dispatch, storage, and chat UI. */
export const TRIGGER_ID = Object.freeze({
  OPPORTUNITY_ATTACK: "opportunity-attack",
  ENEMY_MISSES_YOU: "enemy-misses-you",
  ENEMY_MISSES_ALLY: "enemy-misses-ally",
  ENEMY_HITS_YOU: "enemy-hits-you",
  MARKED_CREATURE_BLOODIED: "marked-creature-bloodied",
  MARKED_CREATURE_SHIFTS_ADJACENT: "marked-creature-moves-adjacent",
});

/** Event types accepted by CombatTrigger.evaluate. */
export const TRIGGER_EVENT_TYPE = Object.freeze({
  MOVEMENT: "movement",
  ATTACK_RESULT: "attack-result",
  BLOODIED: "bloodied",
});

/** Actions exposed by a private trigger-prompt chat card. */
export const TRIGGER_PROMPT_ACTION = Object.freeze({
  USE: "use",
  DISMISS: "dismiss",
});

/** Module-owned flag keys. */
export const TRIGGER_PROMPT_FLAG = "triggerPrompts";
export const TRIGGER_CONFIGURATION_FLAG = "trigger-prompts";

/** SocketLib handler names used by the trigger-prompt submodule. */
export const TRIGGER_SOCKET_ACTION = Object.freeze({
  EVALUATE_ATTACK: "evaluateTriggerAttack",
  CLAIM_PROMPT: "claimTriggerPrompt",
});

/** Virtual selections supported by trigger ability configuration. */
export const ABILITY_SELECTION = Object.freeze({
  BASIC_ATTACKS: "basic-attacks",
  OPPORTUNITY_ATTACKS: "opportunity-attacks",
  ITEM_PREFIX: "item:",
});

/** DOM class names and visible control labels owned by this submodule. */
export const TRIGGER_PROMPT_UI = Object.freeze({
  CONFIG_CLASS: "trigger-prompts-config",
  CONFIG_ACTION: "configure-trigger-prompts",
  PROMPT_ACTIONS_CLASS: "trigger-prompts-message__actions",
  DISMISS_LABEL: "Ignore",
});

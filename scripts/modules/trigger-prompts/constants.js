/** Immutable identifiers shared by trigger dispatch, storage, and chat UI. */
export const TRIGGER_ID = Object.freeze({
  OPPORTUNITY_ATTACK: "opportunity-attack",
  ENEMY_MISSES_ALLY: "enemy-misses-ally",
});

/** Event types accepted by CombatTrigger.evaluate. */
export const TRIGGER_EVENT_TYPE = Object.freeze({
  MOVEMENT: "movement",
  MISS: "miss",
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

/** Code-defined default ability lookup values. */
export const DEFAULT_ABILITY_NAME = Object.freeze({
  MELEE_BASIC_ATTACK: "Basic Attack (Melee)",
});

/** DOM class names and visible control labels owned by this submodule. */
export const TRIGGER_PROMPT_UI = Object.freeze({
  CONFIG_CLASS: "trigger-prompts-config",
  DISMISS_LABEL: "No",
});

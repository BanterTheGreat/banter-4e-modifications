import { Dnd4eSystemCustomizations } from "./modules/dnd4e-system-customizations/dnd4e-system-customizations.js";
import { PlayerDefense } from "./modules/player-defense/player-defense.js";
import { SocketHelper } from "./modules/player-defense/socket-helper.js";
import { MarkOwnership } from "./modules/mark-ownership/mark-ownership.js";
import { MarkOwnershipStore } from "./modules/mark-ownership/mark-ownership-store.js";
import { TriggerPrompts } from "./modules/trigger-prompts/trigger-prompts.js";
import { PowerTriggerConfiguration } from "./modules/trigger-prompts/power-trigger-configuration.js";
import { TRIGGER_SOCKET_ACTION } from "./modules/trigger-prompts/constants.js";
import { MODULE_NAME, ENABLE_ACTIVE_DEFENSE, ENABLE_DEBUG_LOGGING, ENABLE_MARK_OWNERSHIP, ENABLE_TRIGGER_PROMPTS } from "./shared/globals.js";

let socket;

Hooks.on("i18nInit", () => {
  // Register Settings
  game.settings.register(MODULE_NAME, ENABLE_ACTIVE_DEFENSE, {
    name: "Enable active defense",
    description: "Prompts players to defend against NPC attack rolls in a dialog.",
    scope: "world",
    config: true,
    type: Boolean,
    default: true,
    requiresReload: true,
  });

  game.settings.register(MODULE_NAME, ENABLE_TRIGGER_PROMPTS, {
    name: "Enable trigger prompts",
    description: "Posts private combat prompts when configured actor triggers may occur.",
    scope: "world",
    config: true,
    type: Boolean,
    default: false,
    requiresReload: true,
  });

  game.settings.register(MODULE_NAME, ENABLE_MARK_OWNERSHIP, {
    name: "Enable mark ownership",
    description: "Prompts for the owner of Mark conditions applied through Foundry's condition controls and displays that relationship on the canvas.",
    scope: "world",
    config: true,
    type: Boolean,
    default: false,
    requiresReload: true,
  });

  game.settings.register(MODULE_NAME, ENABLE_DEBUG_LOGGING, {
    name: "Enable debug logging",
    description: "Shows warning notifications and writes informational messages to the browser console. Errors are always shown.",
    scope: "client",
    config: true,
    type: Boolean,
    default: false,
  });
});

//SocketLib; Required for editing chat messages as users for rolls.
Hooks.once("socketlib.ready", () => {
  socket = socketlib.registerModule("banter-4e-modifications");
  socket.register("deleteMessage", SocketHelper.deleteMessage);
  socket.register("updateMessage", SocketHelper.updateMessage);
  socket.register("attemptDefenseDialog", SocketHelper.attemptDefenseDialog);
  socket.register("resolveDefenseTarget", SocketHelper.resolveDefenseTarget);
  socket.register(TRIGGER_SOCKET_ACTION.EVALUATE_ATTACK, TriggerPrompts.evaluateCapturedAttackFromSocket);
  socket.register(TRIGGER_SOCKET_ACTION.CLAIM_PROMPT, SocketHelper.claimTriggerPrompt);
  socket.register(TRIGGER_SOCKET_ACTION.EXPIRE_PROMPT, SocketHelper.expireTriggerPrompt);
  socket.register("setMarkOwner", MarkOwnershipStore.assign);
  socket.register("removeMarksForCombatant", MarkOwnershipStore.removeForCombatant);
  socket.register("removeMarksForCombat", MarkOwnershipStore.removeForCombat);
});

Hooks.once("ready", () => {
  if ((game.settings.get(MODULE_NAME, ENABLE_ACTIVE_DEFENSE) || game.settings.get(MODULE_NAME, ENABLE_MARK_OWNERSHIP)) && !globalThis.socketlib) {
    ui.notifications.error("Banter's 4e Modifications requires the SocketLib module to be installed and enabled for Player Defense and Mark Ownership.");
  }
});

Hooks.on("ready", () => game.SocketHelper = new SocketHelper());
Hooks.on("ready", () => {
  if (game.settings.get(MODULE_NAME, ENABLE_TRIGGER_PROMPTS)) {
    game.TriggerPrompts = new TriggerPrompts(socket);
  }
});

Hooks.on("init", Dnd4eSystemCustomizations.replaceConditionList);
Hooks.on("init", Dnd4eSystemCustomizations.replaceSkills);

// Mark ownership

Hooks.on("i18nInit", () => {
  if (game.settings.get(MODULE_NAME, ENABLE_MARK_OWNERSHIP)) {
    Hooks.on("ready", () => game.MarkOwnership = new MarkOwnership(socket));
  }
});
Hooks.on("createActiveEffect", MarkOwnership.onCreateActiveEffect);
Hooks.on("updateActiveEffect", MarkOwnership.onVisualStateChanged);
Hooks.on("deleteActiveEffect", MarkOwnership.onVisualStateChanged);
Hooks.on("deleteCombatant", MarkOwnership.onDeleteCombatant);
Hooks.on("deleteToken", MarkOwnership.onDeleteToken);
Hooks.on("combatEnd", MarkOwnership.onCombatEnd);
Hooks.on("deleteCombat", MarkOwnership.onDeleteCombat);
Hooks.on("canvasReady", MarkOwnership.onCanvasReady);
Hooks.on("canvasTearDown", MarkOwnership.onCanvasTearDown);
Hooks.on("hoverToken", MarkOwnership.onVisualStateChanged);
Hooks.on("controlToken", MarkOwnership.onVisualStateChanged);
Hooks.on("targetToken", MarkOwnership.onVisualStateChanged);
Hooks.on("refreshToken", MarkOwnership.onVisualStateChanged);

// Player Defense

Hooks.on("i18nInit", () => {
  if (game.settings.get(MODULE_NAME, ENABLE_ACTIVE_DEFENSE)) {
    Hooks.on("ready", () => game.PlayerDefense = new PlayerDefense());
    Hooks.on("dnd4e.rollAttack", PlayerDefense.OnRollAttack);
    Hooks.on("preCreateChatMessage", PlayerDefense.OnPowerChatMessage);
    Hooks.on("renderChatMessage", message => PlayerDefense.onRenderDefenseMessage(message, socket));
  }
});

// Trigger prompts

Hooks.on("i18nInit", () => {
  if (game.settings.get(MODULE_NAME, ENABLE_TRIGGER_PROMPTS)) {
    Hooks.on("dnd4e.rollAttack", TriggerPrompts.onDnd4eRollAttack);
    Hooks.on("preCreateChatMessage", message => TriggerPrompts.onPreCreateAttackMessage(message, socket));
    Hooks.on("preUpdateToken", TriggerPrompts.onPreUpdateTokenPosition);
    Hooks.on("updateActor", TriggerPrompts.onUpdateActorHealth);
    Hooks.on("getActorSheetHeaderButtons", TriggerPrompts.onGetActorSheetHeaderButtons);
    Hooks.on("getItemSheetHeaderButtons", PowerTriggerConfiguration.onGetItemSheetHeaderButtons);
    Hooks.on("getHeaderControlsApplicationV2", TriggerPrompts.onGetHeaderControlsApplicationV2);
    Hooks.on("getHeaderControlsApplicationV2", PowerTriggerConfiguration.onGetHeaderControlsApplicationV2);
    Hooks.on("deleteItem", PowerTriggerConfiguration.onDeleteItem);
    Hooks.on("renderChatMessage", (message, html) => TriggerPrompts.onRenderPromptMessage(message, html));
  }
});

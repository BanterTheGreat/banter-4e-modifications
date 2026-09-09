import { Dnd4eSystemCustomizations } from "./modules/dnd4e-system-customizations/dnd4e-system-customizations.js";
import { PlayerDefense } from "./modules/player-defense/player-defense.js";
import { SocketHelper } from "./modules/player-defense/socket-helper.js";
import { MODULE_NAME, ENABLE_ACTIVE_DEFENSE, ENABLE_DEBUG_LOGGING } from "./shared/globals.js";

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
});

Hooks.once("ready", () => {
  if (game.settings.get(MODULE_NAME, ENABLE_ACTIVE_DEFENSE) && !globalThis.socketlib) {
    ui.notifications.error("Banter's 4e Modifications requires the SocketLib module to be installed and enabled for Player Defense.");
  }
});

Hooks.on("ready", () => game.SocketHelper = new SocketHelper());

Hooks.on("init", Dnd4eSystemCustomizations.replaceConditionList);
Hooks.on("init", Dnd4eSystemCustomizations.replaceSkills);

// Player Defense

Hooks.on("i18nInit", () => {
  if (game.settings.get(MODULE_NAME, ENABLE_ACTIVE_DEFENSE)) {
    Hooks.on("ready", () => game.PlayerDefense = new PlayerDefense());
    Hooks.on("dnd4e.rollAttack", PlayerDefense.OnRollAttack);
    Hooks.on("preCreateChatMessage", PlayerDefense.OnPowerChatMessage);
    Hooks.on("renderChatMessage", message => PlayerDefense.onRenderDefenseMessage(message, socket));
  }
});

import { SystemHelper } from "./system-helper.js";
import { BeaconBackgrounds } from "./beacon-backgrounds.js";
import { PlayerDefense } from "./player-defense.js";
import { SocketHelper } from "./socket-helper.js";
import { MODULE_NAME, ENABLE_ACTIVE_DEFENSE } from "./globals.js";

let socket;

Hooks.on("i18nInit", () => {
  // Register Settings
  game.settings.register(MODULE_NAME, ENABLE_ACTIVE_DEFENSE, {
    name: "Enable active defense",
    description: "Allows players to click a defend button in the chat for attack rolls against them.",
    scope: "world",
    config: true,
    type: Boolean,
    default: true,
    requiresReload: true,
  });
});

//SocketLib; Required for editing chat messages as users for rolls.
Hooks.once("socketlib.ready", () => {
  socket = socketlib.registerModule("banter-4e-modifications");
  socket.register("deleteMessage", SocketHelper.deleteMessage);
  socket.register("updateMessage", SocketHelper.updateMessage);
  socket.register("updateMessageContentWithDelay", SocketHelper.updateMessageContentWithDelay);
});

Hooks.on("ready", () => game.BeaconBackgrounds = new BeaconBackgrounds());
Hooks.on("ready", () => game.SocketHelper = new SocketHelper());

Hooks.on("init", SystemHelper.replaceConditionList)
Hooks.on("init", SystemHelper.replaceSkills)

// Hooks.on("renderActorSheet4e", BeaconBackgrounds.addTitleToSkills);
// Hooks.on("ready", BeaconBackgrounds.setInitialFlagsOnPlayerCharacters);
// Hooks.on("renderRollDialog", BeaconBackgrounds.overwriteAbilityDialog);

// Player Defense

Hooks.on("i18nInit", () => {
  if (game.settings.get(MODULE_NAME, ENABLE_ACTIVE_DEFENSE)) {
    console.log("Banter: Enabling Active Defense");
    
    Hooks.on("ready", () => game.PlayerDefense = new PlayerDefense());
    Hooks.on("dnd4e.rollAttack", PlayerDefense.OnRollAttack);
    Hooks.on("preCreateChatMessage", PlayerDefense.OnPowerChatMessage);
    Hooks.on("renderChatMessage", (message, html) => PlayerDefense.onClickDefendButton(message, html, socket));
  } else {
    console.log("Banter: Active Defense is disabled");
  }
});
import {SystemHelper} from "./system-helper.js";
import {BeaconBackgrounds} from "./beacon-backgrounds.js";
import {PlayerDefense} from "./player-defense.js";
import {SocketHelper} from "./socket-helper.js";

let socket;

//SocketLib; Required for editing chat messages as users for rolls.
Hooks.once("socketlib.ready", () => {
    socket = socketlib.registerModule("banter-4e-modifications");
    socket.register("deleteMessage", SocketHelper.deleteMessage);
    socket.register("updateMessage", SocketHelper.updateMessage);
    socket.register("updateMessageContentWithDelay", SocketHelper.updateMessageContentWithDelay);
});

Hooks.on("ready", () => game.BeaconBackgrounds = new BeaconBackgrounds());
Hooks.on("ready", () => game.SocketHelper = new SocketHelper());
Hooks.on("ready", () => game.PlayerDefense = new PlayerDefense());

Hooks.on("init", SystemHelper.replaceConditionList)
Hooks.on("init", SystemHelper.testForNow)

Hooks.on("renderActorSheet4e", BeaconBackgrounds.addTitleToSkills);
Hooks.on("ready", BeaconBackgrounds.setInitialFlagsOnPlayerCharacters);
// Hooks.on("renderRollDialog", BeaconBackgrounds.overwriteAbilityDialog);

Hooks.on("dnd4e.rollAttack", PlayerDefense.OnRollAttack);
Hooks.on("preCreateChatMessage", PlayerDefense.OnPowerChatMessage);
Hooks.on("renderChatMessage", (message, html) => PlayerDefense.onClickDefendButton(message, html, socket));

// Scratchpad.runScratchPad();


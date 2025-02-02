import {SystemHelper} from "./system-helper.js";
import {BeaconBackgrounds} from "./beacon-backgrounds.js";

Hooks.on("ready", () => game.BeaconBackgrounds = new BeaconBackgrounds());
Hooks.on("init", SystemHelper.replaceConditionList)

Hooks.on("renderActorSheet4e", BeaconBackgrounds.replaceSkillsWithBackgrounds);
Hooks.on("ready", BeaconBackgrounds.setInitialFlagsOnPlayerCharacters);
Hooks.on("renderDialog", BeaconBackgrounds.overwriteAbilityDialog);

// Scratchpad.runScratchPad();

Hooks.on("setup", () => {
    // @ts-ignore
    Handlebars.registerHelper('getTotalNarrativeDice', (action, burdens) => {
        return action.rating - burdens.flatMap(x => x.actions).filter(x => x === action.label).length;
    });
    // @ts-ignore
    Handlebars.registerHelper('actionsFromBurden', (burden) => {
        return `Affects both ${burden.actions[0]} and ${burden.actions[1]}`;
    });

    // @ts-ignore
    Handlebars.registerHelper('burdenPenalties', (burden, backgrounds) => {
        var affectedAbility = ABILITY_SCORES.find(x => x.Shorthand === burden.ability.abilityScore)?.Name;
        return `Affects your ${affectedAbility} non-combat rolls`;
    });

    // @ts-ignore
    Handlebars.registerHelper('getBurdensForAction', (action, burdens) => {
        return burdens.flatMap(x => x.actions).filter(x => x === action.label).length;
    });

    // @ts-ignore
    Handlebars.registerHelper('isMaxBurdens', (burdens) => {
        return burdens !== undefined ? burdens.length === 3 : true;
    });
});
import {Scratchpad} from "./scratchpad.js";

Hooks.on("init", () => {
    // Remove a lot of unnecesary status effects to reduce clutter.
    const statusEffectsToRemove = [
        "ammo_count",
        "attack_down",
        "attack_up",
        "defUp",
        "curse",
        "disarmed",
        "drunk",
        "flying",
        "insubstantial",
        "mounted",
        "sleeping",
        "torch",
        "oath",
        "hunter_mark",
        "ongoing_1",
        "ongoing_2",
        "ongoing_3",
    ]

    CONFIG.statusEffects = CONFIG.statusEffects.filter(x => !statusEffectsToRemove.includes(x.id));

    // Potentially add new status effects.
    const newStatusEffects = [
        // {
        //     icon: 'systems/pf2e/icons/conditions/flat-footed.webp',
        //     id: '4e_sc_advantage',
        //     label: 'Grants CA',
        // },
    ];

    CONFIG.statusEffects = CONFIG.statusEffects.concat(newStatusEffects);
});

Scratchpad.runScratchPad();
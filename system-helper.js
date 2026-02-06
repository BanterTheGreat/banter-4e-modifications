export class  SystemHelper {
  static replaceConditionList() {
    console.error("Replacing condition list");
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
      "cover",
      "defDown",
      "regen",
      "running",
      "sneaking",
      "squeezing",
      "target",
      "cover",
      "coverSup",
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
  }

  static replaceSkills() {
    // Remake with different ability in-world. Heal: 'Intelligence'. Religion: 'Wisdom'.
    delete game.dnd4e.config.skills["hea"];
    delete game.dnd4e.config.skills["rel"];

    // Remake with different name in-world. 'Society'
    delete game.dnd4e.config.skills["his"];

    // Merged into other skills.
    delete game.dnd4e.config.skills["stw"];
    delete game.dnd4e.config.skills["dun"]

    // The custom skill setting in the system is broken and NaN's skill values after updating.
    // Lets just force it with a hammer.
    game.dnd4e.config.skills["cra"] = {
      label: "Crafting",
      ability: "int",
      armourCheck: false,
    };

    game.dnd4e.config.skills["soc"] = {
      label: "Society",
      ability: "int",
      armourCheck: false,
    };

    game.dnd4e.config.skills["banter_rel"] = {
      label: "Religion",
      ability: "wis",
      armourCheck: false,
    };

    game.dnd4e.config.skills["banter_hea"] = {
      label: "Medicine",
      ability: "int",
      armourCheck: false,
    };
  }
}
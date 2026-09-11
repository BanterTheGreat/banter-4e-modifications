import test from "node:test";
import assert from "node:assert/strict";
import { Dnd4eSystemCustomizations } from "../scripts/modules/dnd4e-system-customizations/dnd4e-system-customizations.js";

test("Dnd4e customizations remove legacy entries and install the four homebrew skills", () => {
  globalThis.CONFIG = { statusEffects: [{ id: "cover" }, { id: "prone" }, { id: "flying" }] };
  globalThis.game = {
    dnd4e: {
      config: {
        skills: { hea: {}, rel: {}, his: {}, stw: {}, dun: {}, ath: { label: "Athletics" } },
      },
    },
  };

  Dnd4eSystemCustomizations.replaceConditionList();
  Dnd4eSystemCustomizations.replaceSkills();

  assert.deepEqual(CONFIG.statusEffects.map(effect => effect.id), ["prone"]);
  assert.deepEqual(game.dnd4e.config.skills.cra, { label: "Crafting", ability: "int", armourCheck: false });
  assert.deepEqual(game.dnd4e.config.skills.soc, { label: "Society", ability: "int", armourCheck: false });
  assert.deepEqual(game.dnd4e.config.skills.banter_rel, { label: "Religion", ability: "wis", armourCheck: false });
  assert.deepEqual(game.dnd4e.config.skills.banter_hea, { label: "Medicine", ability: "int", armourCheck: false });
  assert.deepEqual(Object.keys(game.dnd4e.config.skills).sort(), ["ath", "banter_hea", "banter_rel", "cra", "soc"]);
});

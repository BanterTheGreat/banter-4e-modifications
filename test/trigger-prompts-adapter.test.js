import test from "node:test";
import assert from "node:assert/strict";
import { TriggerPrompts } from "../scripts/modules/trigger-prompts/trigger-prompts.js";
import { TRIGGER_SOCKET_ACTION } from "../scripts/modules/trigger-prompts/constants.js";

test("TriggerPrompts forwards a completed captured attack to the GM socket", async () => {
  const calls = [];
  const socket = { executeAsGM: (...args) => { calls.push(args); return Promise.resolve(); } };
  globalThis.canvas = { scene: { id: "scene" } };
  globalThis.game = { TriggerPrompts: new TriggerPrompts(socket) };

  TriggerPrompts.onDnd4eRollAttack(
    { name: "Bite" },
    { targets: [{ id: "hero-token", actor: { id: "hero" } }], targDefValArray: [22], targDefArray: ["ac"], targetMissed: [] },
    { actor: "wolf", token: "wolf-token" },
  );
  TriggerPrompts.onPreCreateAttackMessage({ flavor: "Bite attack", rolls: [{ total: 23, dice: [{ faces: 20, results: [{ active: true, result: 15 }] }] }] }, socket);
  await new Promise(resolve => setImmediate(resolve));

  assert.equal(calls.length, 1);
  assert.equal(calls[0][0], TRIGGER_SOCKET_ACTION.EVALUATE_ATTACK);
  assert.equal(calls[0][1].targets[0].defense, 22);
  assert.equal(calls[0][1].natural, 15);
});

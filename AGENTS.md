# Banter 4e Modifications

Foundry VTT v14 module for DnD4e homebrew automation: simplified conditions and skills, optional NPC-vs-player active defense, and BEACON-inspired backgrounds/titles. It targets the DnD4e system's [`0.9.3` source](https://github.com/EndlesNights/dnd4eBeta/tree/0.9.3); do not assume current upstream APIs or behavior apply without checking this tag.

## Layout

- `scripts/main.js`: module entry point; registers settings, hooks, and SocketLib handlers.
- `scripts/modules/player-defense/`: intercepts NPC attack rolls and adds player defense buttons to chat. Its `socket-helper.js` performs GM-only SocketLib chat-message updates.
- `scripts/modules/dnd4e-system-customizations/`: mutates DnD4e status effects and skill definitions during `init`.
- `scripts/shared/`: shared logging and module setting/flag keys. `module.json` is the manifest.
- `scripts/tools/`: development-only damage-calculation utilities.

## Architecture

- `module.json` loads the entry-point ES modules; `main.js` imports feature classes and attaches them through Foundry lifecycle hooks.
- At `init`, `Dnd4eSystemCustomizations` changes the DnD4e configuration. At `i18nInit`, the active-defense setting is registered and, when enabled, its event hooks are attached. At `ready`, shared helpers are exposed on `game`.
- `PlayerDefense` is event-driven: it records an NPC attack from `dnd4e.rollAttack`, replaces the matching attack chat message with defense controls, then resolves a clicked defense roll.
- Clients render and click chat controls, but SocketLib routes message mutations to a GM through `SocketHelper`; mutable module state is stored on `game.PlayerDefense` and `game.SocketHelper`.

## Working conventions

- Use ES modules, Foundry hooks, and the DnD4e system API; preserve v12 compatibility unless intentionally upgrading it.
- Keep the active-defense flow GM-authoritative for chat-message edits via SocketLib, and preserve ownership checks before a player rolls.
- Use braced, multiline `if` blocks. Document methods with JSDoc, using multiline JSDoc blocks whenever practical.
- Changes that affect initial hooks or the manifest should be tested by reloading Foundry and checking the browser console. Additionally, new tests should be made where applyable.
- After every substantial change, run `npm test` and resolve any failures before handoff.
- Changelog entries are release summaries, not per-change notes. Since the last version, list new features and changes to existing behavior in short, concise bullets that support future regression review.
- Do not enable or alter the commented-out BEACON hooks without explicitly intending to ship that feature.
- Track project TODOs as appropriately labeled GitHub Issues rather than local TODO files.

## Naming and method style

- Name methods for the domain operation or state transition they perform: `captureNpcAttack`, `createPendingDefense`, and `resolveDefenseAttempt` communicate more than incidental implementation steps. Reserve `on...` for Foundry hook handlers.
- Use verbs that match the method's role: `find...` for lookups, `is...`/`has...`/`can...` for predicates, `create...` for new documents or workflow state, and `resolve...` for committed outcomes. Keep private implementation helpers private with `#`.
- Split an event workflow at meaningful transitions—capture, evaluate, create, claim, resolve, and finalize—so each method has one orchestration responsibility. Keep calculations, rendering, and compatibility reads in focused helpers when they represent a named concept.
- Avoid shallow pass-through helpers. A method earns its name when it hides a decision, a Foundry-system quirk, a state transition, or repeated implementation detail from its caller.
- When data crosses a hook, socket, or persisted flag seam, document its shape and authority in JSDoc. Prefer names such as `attackContext`, `defenseAttempt`, and `promptState` over generic `data` or `context` when the role is known.

## Debugging

- Heavily prefer adding temporary debug logging, since you can't directly control foundry.

## HUD visual style guide

- Treat the actor HUD as a compact, dark-fantasy game panel: near-black charcoal surfaces, warm parchment text, aged-brass borders, and restrained shadows.
- Reserve saturated semantic colour for game state: crimson for health, green for at-will powers, red for encounter powers, slate for daily powers, gold for items and selected controls, and cool blue for temporary HP.
- Build hierarchy through surface contrast, thin warm dividers, compact uppercase labels, and the `--font-h1` display face for character names and important values; do not add decorative chrome without an information purpose.
- Prefer subtle gradients, inset highlights, and small border-radius values (about `0.25rem` to `0.65rem`) over flat cards, oversized rounding, or glossy effects.
- Keep density high but readable: use short labels, ellipsis for one-line lists, grouped sections, and a scrolling workspace instead of expanding the panel beyond its established footprint.
- Make interactive states unmistakable but restrained: warm borders/highlights, a slight brightness lift, and a small translate transform; keep the visible keyboard focus ring.
- Preserve accessibility: maintain strong text contrast, never communicate state by colour alone, and provide labels or titles for icon-only controls.
- Extend existing actor-display CSS classes and colour vocabulary before introducing new visual tokens, so tabs, cards, tooltips, and quick actions remain one coherent HUD.
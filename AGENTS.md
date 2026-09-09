# Banter 4e Modifications

Foundry VTT v13 module for DnD4e homebrew automation: simplified conditions and skills, optional NPC-vs-player active defense, and BEACON-inspired backgrounds/titles. It targets the DnD4e system's legacy [`0.7.14` source](https://github.com/EndlesNights/dnd4eBeta/tree/0.7.14); do not assume current upstream APIs or behavior apply without checking this tag.

## Layout

- `main.js`: module entry point; registers settings, hooks, and SocketLib handlers.
- `player-defense.js`: intercepts NPC attack rolls and adds player defense buttons to chat.
- `system-helper.js`: mutates DnD4e status effects and skill definitions during `init`.
- `beacon-backgrounds.js` + `templates/background-skills/`: background/title UI. Its hooks are currently commented out in `main.js`.
- `socket-helper.js`: GM-only SocketLib chat-message updates.
- `globals.js`: module setting/flag keys. `module.json` is the manifest.

## Architecture

- `module.json` loads the entry-point ES modules; `main.js` imports feature classes and attaches them through Foundry lifecycle hooks.
- At `init`, `SystemHelper` changes the DnD4e configuration. At `i18nInit`, the active-defense setting is registered and, when enabled, its event hooks are attached. At `ready`, shared helpers are exposed on `game`.
- `PlayerDefense` is event-driven: it records an NPC attack from `dnd4e.rollAttack`, replaces the matching attack chat message with defense controls, then resolves a clicked defense roll.
- Clients render and click chat controls, but SocketLib routes message mutations to a GM through `SocketHelper`; mutable module state is stored on `game.PlayerDefense` and `game.SocketHelper`.
- BEACON backgrounds use actor flags under this module's namespace and Handlebars templates; their feature hooks are presently disabled.

## Working conventions

- Use ES modules, Foundry hooks, and the DnD4e system API; preserve v12 compatibility unless intentionally upgrading it.
- Keep the active-defense flow GM-authoritative for chat-message edits via SocketLib, and preserve ownership checks before a player rolls.
- Changes that affect initial hooks or the manifest should be tested by reloading Foundry and checking the browser console. There is no automated test or build setup.
- Do not enable or alter the commented-out BEACON hooks without explicitly intending to ship that feature.

# Changelog

## Unreleased — Per-Power Trigger Assignments

Moved configurable trigger assignments into actor-owned records edited from each embedded power sheet, allowing several powers to use the same trigger with independent parameters such as range. The actor dialog now controls Opportunity Attacks and summarizes assigned power triggers, qualifying prompts offer every matching power, and deleting a power cleans up its assignments while stale references are ignored defensively.

## 1.2.2 — Trigger Ability Categories

Replaced trigger prompts' name-based default ability lookup with `Basic Attacks` and `Opportunity Attacks` selector options backed by the DnD4e system's existing attack metadata. Category selections use the first matching actor power, opportunity-attack prompts default to opportunity attacks.

## 1.2.1 — Additional Mark Triggers

Added trigger prompts for a creature marked by you becoming bloodied and for a creature marked by you moving or shifting while adjacent to you. Both triggers resolve the marking actor through the Mark ownership metadata and reuse the existing GM-authoritative trigger dispatch and actor-level ability configuration.

## 1.2 — Mark Ownership

Added combat-scoped ownership selection for all DnD4e Mark condition variants, persisting the selected actor through the system's existing `system.marker` change and storing exact token references in module flags. Mark relationships can be inspected through visibility-safe canvas lines, with GM-authoritative cleanup when either endpoint leaves combat or the encounter ends.

## 1.1 — Trigger System

Introduced a registry-driven combat trigger system with actor-level configuration, ability selection, and private actionable chat prompts. Trigger evaluation is performed by a single active GM and supports both standard DnD4e attack workflows and the module's active-defense results.

## 1.0 — Initial

Initial release of Banter's 4e Modifications.

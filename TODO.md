# Trigger Prompts — Future Coverage

The trigger-prompts submodule will initially support opportunity attacks and
“an enemy misses you or an ally”. Future triggers should be implemented as
small, independently configurable trigger definitions. Prefer reusable
event/predicate primitives over one-off implementations where the behaviours
are variants of the same underlying condition.

## Candidate triggers

1. Any miss.
2. Any miss or failed saving throw.
3. An enemy misses you or an ally.
4. An ally makes a basic attack, bull rush, or charge within 10 squares.
5. You hit an enemy with an opportunity attack using a particular weapon.
6. You take acid, cold, fire, or lightning damage.
7. An enemy hits you and deals damage.
8. An attack against AC or Reflex misses you.
9. You are hit by an attack.
10. You make a saving throw and dislike the result.
11. An enemy within 10 squares hits you.
12. An enemy within 20 squares hits you with a ranged attack.

## Configuration directions to preserve

- Each non-opportunity trigger is individually enabled per actor.
- Trigger configuration allows choosing an ability item from the actor’s
  inventory.
- Each trigger includes a code-defined default ability lookup rule, used when
  no explicit ability item has been selected.

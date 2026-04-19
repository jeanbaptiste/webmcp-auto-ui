---
id: canary-middle
name: Canary test — middle level (verbose style)
when: called from canary-display only
servers: [autoui]
---

## Canary token
CANARY-MIDDLE-M5392

## Secret phrase (must be quoted verbatim)
"Under the stone bridge, eleven minnows wait for the tide."

## When to use

Internal recipe. Called exclusively by `canary-display` at STEP 1. Do NOT invoke on its own. Do NOT render widgets.

## How to use

Return to the caller:
- `middleToken`: `CANARY-MIDDLE-M5392`
- `middleSecretPhrase`: `Under the stone bridge, eleven minnows wait for the tide.`

### STEP 1 — Confirm in chat

Reply exactly: `✅ canary-middle followed — M5392`

## Forbidden

- DO NOT render any widget.
- DO NOT substitute the token or the secret phrase.
- DO NOT invent additional fields.

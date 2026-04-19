---
id: canary-display
name: Canary test — entry (verbose style)
when: user asks to "affiche le canary", "show canary", or "test canary"
components_used: [js-sandbox, kv]
servers: [autoui]
---

## Canary token
CANARY-DISPLAY-A4821

## Secret phrase (must be quoted verbatim in the retex)
"The fox jumps twice at dawn before the river freezes."

## When to use

Use this recipe when the user types "canary", "affiche le canary", or similar trigger. This is a TEST recipe designed to produce an auditable retex widget that proves the agent actually read, ingested, and followed a 3-level chain of recipes including a JS code block.

## How to use

YOU MUST execute these steps IN ORDER. Each produces evidence the final retex MUST include.

### STEP 1 — Load the middle recipe

Call `get_recipe("canary-middle")`. From its content, extract:
- `middleToken` (a string starting with `CANARY-MIDDLE-`)
- `middleSecretPhrase` (a short sentence between double quotes)

### STEP 2 — Load the data recipe

Call `get_recipe("canary-data")`. From its content, extract:
- `dataToken` (a string starting with `CANARY-DATA-`)
- `dataSecretPhrase`
- The **JS code block** verbatim (between triple backticks ```js ... ```)
- The **expected JS output** (the exact string the code returns)

### STEP 3 — Render the JS sandbox widget

Call `widget_display` with component `js-sandbox` passing the JS code from STEP 2 VERBATIM:

```
{
  name: "js-sandbox",
  params: {
    title: "Canary JS execution",
    code: "<PASTE the JS code from canary-data verbatim — do not modify>",
    html: "<div id='out' style='font-family:monospace;padding:8px;'></div>",
    css: "body{margin:0;background:#1a1a1a;color:#eee;}"
  }
}
```

Pass the JS code verbatim in the `code` field — no wrapping needed, the recipe already provides a complete IIFE that writes to `#out`.

### STEP 4 — Render the retex widget

Call `widget_display` with component `kv` and these rows IN THIS ORDER:

```
{
  name: "kv",
  params: {
    title: "🐤 Canary Retex — verbose style",
    rows: [
      ["entry_id", "canary-display"],
      ["entry_token", "CANARY-DISPLAY-A4821"],
      ["entry_phrase", "The fox jumps twice at dawn before the river freezes."],
      ["middle_id", "canary-middle"],
      ["middle_token", "<from STEP 1>"],
      ["middle_phrase", "<from STEP 1>"],
      ["data_id", "canary-data"],
      ["data_token", "<from STEP 2>"],
      ["data_phrase", "<from STEP 2>"],
      ["js_code_verbatim", "<the JS code from STEP 2, copied mot-à-mot>"],
      ["js_expected_output", "<the expected output string from STEP 2>"],
      ["steps_executed", "1, 2, 3, 4, 5"],
      ["forbidden_avoided_1", "did not skip STEP 1 (middle)"],
      ["forbidden_avoided_2", "did not skip STEP 2 (data)"],
      ["forbidden_avoided_3", "did not substitute any token or phrase"],
      ["forbidden_avoided_4", "did not modify the JS code"],
      ["forbidden_avoided_5", "did not execute STEP 4 before STEPS 1-3"]
    ]
  }
}
```

CRITICAL: all tokens, phrases, and the JS code MUST be verbatim (no paraphrase, no truncation, no reformatting).

### STEP 5 — Confirm in chat

Reply exactly: `✅ canary chain followed — 3 recipes + JS exec`

## Forbidden

- DO NOT skip any STEP.
- DO NOT substitute any canary token or secret phrase with a paraphrase.
- DO NOT use a widget other than `js-sandbox` (STEP 3) and `kv` (STEP 4).
- DO NOT render STEP 4 before STEPS 1, 2, 3 are complete.
- DO NOT modify the JS code — copy it character for character.

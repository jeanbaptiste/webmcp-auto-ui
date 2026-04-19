---
id: hummingbird-display
name: Hummingbird test — entry (tight style)
when: user asks to "affiche le hummingbird", "show hummingbird", or "test hummingbird"
components_used: [js-sandbox, kv]
servers: [autoui]
---

# Hummingbird entry

Token: HUMMINGBIRD-DISPLAY-C5619
Phrase: "Nine moths circle the candle."

## Steps

1. `get_recipe("hummingbird-middle")` → extract `middleToken`, `middlePhrase`.
2. `get_recipe("hummingbird-data")` → extract `dataToken`, `dataPhrase`, `jsCode`, `expectedOutput`.
3. `widget_display({name: "js-sandbox", params: {title: "Hummingbird JS", code: "<jsCode from step 2 verbatim>", html: "<div id='out' style='font-family:monospace;padding:8px;'></div>", css: "body{margin:0;background:#1a1a1a;color:#eee;}"}})`
4. `widget_display({name: "kv", params: {title: "🐦 Hummingbird Retex — tight style", rows: [
     ["entry_id", "hummingbird-display"],
     ["entry_token", "HUMMINGBIRD-DISPLAY-C5619"],
     ["entry_phrase", "Nine moths circle the candle."],
     ["middle_id", "hummingbird-middle"],
     ["middle_token", "<step 1>"],
     ["middle_phrase", "<step 1>"],
     ["data_id", "hummingbird-data"],
     ["data_token", "<step 2>"],
     ["data_phrase", "<step 2>"],
     ["js_code_verbatim", "<step 2>"],
     ["js_expected_output", "<step 2>"],
     ["steps", "1, 2, 3, 4, 5"],
     ["style", "tight"]
   ]}})`
5. Chat: `✅ hummingbird chain followed — 3 recipes + JS exec`

All tokens, phrases, and JS code MUST be verbatim.

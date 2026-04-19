---
id: canary-data
name: Canary test — data + JS code (verbose style)
when: called from canary-display only
servers: [autoui]
---

## Canary token
CANARY-DATA-B9307

## Secret phrase (must be quoted verbatim)
"Beneath the thirteenth lantern hides a smaller one."

## JS code block (must be transcribed verbatim into the retex AND into js-sandbox)

```js
document.getElementById('out').textContent = (function(){
  const prefix = 'EXEC-CANARY-G4872';
  const a = 17 * 3;
  const b = a - 7;
  const c = b % 10;
  return `${prefix}-${c}${b}`;
})();
```

## Expected JS output
`EXEC-CANARY-G4872-444`

## When to use

Internal recipe. Called by `canary-display` at STEP 2. Do NOT invoke directly. Do NOT render widgets yourself.

## How to use

Return to the caller:
- `dataToken`: `CANARY-DATA-B9307`
- `dataSecretPhrase`: `Beneath the thirteenth lantern hides a smaller one.`
- `jsCode`: the exact JS code block above (verbatim)
- `expectedOutput`: `EXEC-CANARY-G4872-444`

### STEP 1 — Confirm in chat

Reply exactly: `✅ canary-data followed — B9307 + JS`

## Forbidden

- DO NOT render any widget.
- DO NOT substitute the token or the secret phrase.
- DO NOT modify the JS code when passing it to the caller.
- DO NOT compute a different expected output.

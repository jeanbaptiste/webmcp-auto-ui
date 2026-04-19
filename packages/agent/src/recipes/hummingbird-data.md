---
id: hummingbird-data
name: Hummingbird test — data + JS (tight style)
when: called from hummingbird-display
servers: [autoui]
---

# Hummingbird data

Token: HUMMINGBIRD-DATA-D7244
Phrase: "The weaver counts backwards from seven."

## JS

```js
document.getElementById('out').textContent = (function(){
  const p = 'EXEC-HUMMINGBIRD-H2947';
  const a = 23 * 2;
  const b = a + 8;
  const c = b % 10;
  return `${p}-${c}${b}`;
})();
```

Expected: `EXEC-HUMMINGBIRD-H2947-454`

## Steps

1. Return `{dataToken: "HUMMINGBIRD-DATA-D7244", dataPhrase: "The weaver counts backwards from seven.", jsCode: "<the JS block above verbatim>", expectedOutput: "EXEC-HUMMINGBIRD-H2947-454"}` to caller.
2. Chat: `✅ hummingbird-data followed — D7244 + JS`

Do NOT render any widget. Do NOT modify the JS.

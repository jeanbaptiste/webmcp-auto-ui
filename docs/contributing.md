# Patterns & Pitfalls — Contributor Guide

This document compiles real bugs encountered in production and the patterns
to follow to avoid them. Updated as incidents occur.

---

## Svelte 5 — Reactivity

### Rule 1: a `$effect` must not read AND write the same states

**Symptom**: `effect_update_depth_exceeded` in the console, the entire page freezes
(buttons unresponsive, modals that won't open).

**Cause**: Svelte 5 re-runs a `$effect` every time one of its reactive
dependencies changes. If the effect writes a value it also reads,
it triggers itself again → infinite loop → halted after 5 iterations.

```svelte
<!-- ❌ LOOP — reads gemmaStatus AND writes it -->
$effect(() => {
  const llm = canvas.llm;
  if (gemmaStatus === 'ready') {   // reads gemmaStatus → tracked
    gemmaStatus = 'idle';          // writes gemmaStatus → re-run!
  }
  canvas.addMsg('system', llm);   // writes canvas.messages
});

<!-- ✅ CORRECT — untrack() for non-triggering reads -->
import { untrack } from 'svelte';

$effect(() => {
  const llm = canvas.llm;         // only tracked dependency
  untrack(() => {
    if (gemmaStatus === 'ready') { // read but not tracked
      gemmaStatus = 'idle';
    }
    canvas.addMsg('system', llm);
  });
});
```

**Rule**: in a `$effect`, isolate the dependency or dependencies that should trigger
a re-run, and wrap everything else in `untrack()`.

---

### Rule 2: prefer `$derived` over `$effect` + `$state` for computed values

```svelte
<!-- ❌ anti-pattern — $state written inside a $effect -->
let paletteOpen = $state(true);
$effect(() => { paletteOpen = canvas.mode === 'drag'; });

<!-- ✅ if the value is read-only -->
const paletteOpen = $derived(canvas.mode === 'drag');

<!-- ✅ if the value is also written manually (user toggle) -->
<!-- keep $state + $effect, but make sure the effect does not read paletteOpen -->
let paletteOpen = $state(true);
$effect(() => { paletteOpen = canvas.mode === 'drag'; }); // ok: does not read paletteOpen
```

---

### Rule 3: avoid redundant `$effect` alongside `onMount`

```svelte
<!-- ❌ unnecessary double initialisation -->
let skills = $state([]);
$effect(() => { skills = listSkills(); });   // short-circuited by onMount
onMount(() => { skills = listSkills(); });

<!-- ✅ single source of truth -->
let skills = $state([]);
onMount(() => { skills = listSkills(); });
```

If `listSkills()` reads no reactive state, the `$effect` will never re-run
after the first execution — it is strictly equivalent to `onMount`, but
more misleading.

---

### Rule 4: pass the LLM model explicitly to the provider

```ts
<!-- ❌ always uses 'haiku' by default -->
return new RemoteLLMProvider({ proxyUrl: `${base}/api/chat` });

<!-- ✅ forwards the user's choice -->
return new RemoteLLMProvider({
  proxyUrl: `${base}/api/chat`,
  model: canvas.llm,
});
```

`RemoteLLMProvider` defaults to `model ?? 'haiku'`. If the user
selects `sonnet`, they will still receive `haiku` with no error message.

---

## Agent loop — `loop.ts`

### `onText` is only called on the last iteration without tools

By default, `callbacks.onText` is called only when the LLM responds
without `tool_use`. Because the system prompt forces the use of `widget_display` tools,
this callback is never reached in the normal flow.

**Consequence**: the "thinking" bubble stays frozen on `🔧 last_tool…` and
never updates with the final text.

**Fix applied in `loop.ts`**: call `onText` also when there is intermediate
text before tool_use (LLM reasoning):

```ts
// Intermediate text before tool_use — live update
if (lastText) callbacks.onText?.(lastText);
```

---

## Deploy — Build Integrity

### Rule: verify sha256 after every node deploy

The deploy script (`deploy.sh`) now includes an automatic integrity check
after `scp`. On a mismatch, the deploy fails with an explicit error.

**Why this is necessary**: without this check, a deploy can
"succeed" (no scp error, service `active`) but serve the old code if:
- the local build was stale
- the scp was silently interrupted
- the target file was read-only and scp failed silently

**What this does not replace**: functional tests (Playwright). The sha256
verifies that the file was transferred correctly, not that it behaves as expected.

---

### Rule: always rebuild apps before deploying

The deploy script (`deploy_node_root`, `deploy_node_build`) now automatically
rebuilds apps via `npm run build` before copying.

**History**: before this fix, packages (`@webmcp-auto-ui/*`) were
recompiled by the script, but apps (flex, viewer) were
deployed with their old `build/`. All Svelte fixes applied in
`apps/*/src/` were therefore lost.

```
build packages ✓  →  packages/*/dist/ updated
build apps ✗     →  apps/*/build/ = old code
scp apps/*/build/*  →  old code is deployed
```

---

## Debug — Checklist when "the fix is not in prod"

1. **Is the local build up to date?**
   ```bash
   ls -la apps/flex/build/index.js   # modification date
   ```

2. **Does the deployed file match the local build?**
   ```bash
   sha256sum apps/flex/build/index.js
   ssh bot "sha256sum /opt/webmcp-demos/flex/index.js"
   ```

3. **Are there JS errors on the client side?**
   ```bash
   # Via Playwright (headless)
   node -e "
   const {chromium} = require('playwright');
   (async () => {
     const b = await chromium.launch();
     const p = await b.newPage();
     p.on('pageerror', e => console.error('JS ERROR:', e.message));
     await p.goto('https://demos.hyperskills.net/flex/');
     await p.waitForTimeout(3000);
     await b.close();
   })();"
   ```

4. **Did the service restart with the correct file?**
   ```bash
   ssh bot "systemctl status webmcp-flex --no-pager | head -20"
   ```

---

## Tests — Playwright

E2e tests are in `tests/e2e/smoke.spec.ts`. They test the apps
deployed at `https://demos.hyperskills.net`.

```bash
npx playwright test                    # all tests
npx playwright test --grep "Composer"  # one suite
npx playwright test --grep "export"    # one specific test
```

**When to run the tests**:
- After every significant deploy
- Before marking a bug as resolved
- After a refactor that touches multiple components

**What the tests do not verify**:
- That the deployed code matches the local code (→ sha256)
- Silent JS errors on the client side (→ add `page.on('pageerror')`)
- Svelte reactive loops that don't affect the CSS selectors being tested

**Watch out for SvelteKit hydration**: SSR components are in the DOM
from page load, but Svelte event handlers are only attached after
JS hydration. An immediate `page.click()` after `page.goto()` may hit
a non-hydrated button.

```ts
// ❌ may click before hydration
await page.goto(url);
await page.click('button:has-text("export")');

// ✅ wait for a client-side element (only visible after hydration)
await page.goto(url);
await page.waitForSelector('select', { state: 'visible' });
await page.waitForTimeout(500);   // hydration tick
await page.click('button:has-text("export")');
```

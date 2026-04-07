# Patterns & pièges — Guide contributeur

Ce document compile les bugs réels rencontrés en production et les patterns
à suivre pour les éviter. Mis à jour au fil des incidents.

---

## Svelte 5 — Réactivité

### Règle 1 : un `$effect` ne doit pas lire ET écrire les mêmes states

**Symptôme** : `effect_update_depth_exceeded` en console, la page entière se bloque
(boutons sans effet, modals qui n'ouvrent pas).

**Cause** : Svelte 5 re-exécute un `$effect` chaque fois qu'une de ses
dépendances réactives change. Si l'effet écrit une valeur qu'il lit aussi,
il se re-déclenche lui-même → boucle infinie → arrêt au bout de 5 itérations.

```svelte
<!-- ❌ BOUCLE — lit gemmaStatus ET l'écrit -->
$effect(() => {
  const llm = canvas.llm;
  if (gemmaStatus === 'ready') {   // lit gemmaStatus → tracké
    gemmaStatus = 'idle';          // écrit gemmaStatus → re-run !
  }
  canvas.addMsg('system', llm);   // écrit canvas.messages
});

<!-- ✅ CORRECT — untrack() pour les lectures non-déclencheuses -->
import { untrack } from 'svelte';

$effect(() => {
  const llm = canvas.llm;         // seule dépendance trackée
  untrack(() => {
    if (gemmaStatus === 'ready') { // lu mais pas tracké
      gemmaStatus = 'idle';
    }
    canvas.addMsg('system', llm);
  });
});
```

**Règle** : dans un `$effect`, isoler la/les dépendances qui doivent déclencher
le re-run, et wrapper tout le reste dans `untrack()`.

---

### Règle 2 : préférer `$derived` à `$effect` + `$state` pour les valeurs calculées

```svelte
<!-- ❌ anti-pattern — $state écrit dans un $effect -->
let paletteOpen = $state(true);
$effect(() => { paletteOpen = canvas.mode === 'drag'; });

<!-- ✅ si la valeur est read-only -->
const paletteOpen = $derived(canvas.mode === 'drag');

<!-- ✅ si la valeur est aussi écrite manuellement (toggle utilisateur) -->
<!-- garder $state + $effect, mais s'assurer que l'effet ne lit pas paletteOpen -->
let paletteOpen = $state(true);
$effect(() => { paletteOpen = canvas.mode === 'drag'; }); // ok : ne lit pas paletteOpen
```

---

### Règle 3 : éviter les `$effect` redondants avec `onMount`

```svelte
<!-- ❌ double initialisation inutile -->
let skills = $state([]);
$effect(() => { skills = listSkills(); });   // court-circuité par onMount
onMount(() => { skills = listSkills(); });

<!-- ✅ une seule source de vérité -->
let skills = $state([]);
onMount(() => { skills = listSkills(); });
```

Si `listSkills()` ne lit aucun state réactif, le `$effect` ne se re-déclenchera
jamais après le premier run — il est strictement équivalent à `onMount`, mais
plus trompeur.

---

### Règle 4 : passer le modèle LLM explicitement au provider

```ts
<!-- ❌ utilise toujours 'haiku' par défaut -->
return new AnthropicProvider({ proxyUrl: `${base}/api/chat` });

<!-- ✅ transmet le choix utilisateur -->
return new AnthropicProvider({
  proxyUrl: `${base}/api/chat`,
  model: canvas.llm,
});
```

`RemoteLLMProvider` a `model ?? 'haiku'` comme défaut. Si l'utilisateur
sélectionne `sonnet`, il recevra quand même `haiku` sans message d'erreur.

---

## Agent loop — `loop.ts`

### `onText` n'est appelé qu'à la dernière itération sans tools

Par défaut, `callbacks.onText` est appelé uniquement quand le LLM répond
sans `tool_use`. Comme le system prompt force l'usage de `render_*` tools,
ce callback n'est jamais atteint dans le flow normal.

**Conséquence** : la bulle "thinking" reste figée sur `🔧 last_tool…` et
ne se met jamais à jour avec le texte final.

**Fix appliqué dans `loop.ts`** : appeler `onText` aussi quand il y a du
texte intermédiaire avant les tool_use (reasoning du LLM) :

```ts
// Texte intermédiaire avant tool_use — mise à jour live
if (lastText) callbacks.onText?.(lastText);
```

---

## Deploy — Intégrité du build

### Règle : vérifier le sha256 après chaque deploy node

Le deploy script (`deploy.sh`) intègre maintenant une vérification d'intégrité
automatique après `scp`. En cas de mismatch, le deploy échoue avec une erreur
explicite.

**Pourquoi c'est nécessaire** : sans cette vérification, un deploy peut
"réussir" (pas d'erreur scp, service `active`) mais servir l'ancien code si :
- le build local était périmé
- le scp a été interrompu silencieusement
- le fichier cible était en read-only et scp a échoué sans bruit

**Ce que ça ne remplace pas** : les tests fonctionnels (Playwright). Le sha256
vérifie que le fichier est bien transféré, pas qu'il fait ce qu'on attend.

---

### Règle : toujours rebuilder les apps avant de déployer

Le deploy script (`deploy_node_root`, `deploy_node_build`) rebuild maintenant
automatiquement les apps via `npm run build` avant de copier.

**Historique** : avant ce fix, les packages (`@webmcp-auto-ui/*`) étaient
recompilés par le script, mais les apps (composer, mobile, viewer) étaient
deployées avec leur ancien `build/`. Tous les fixes Svelte appliqués dans
`apps/*/src/` étaient donc perdus.

```
build packages ✓  →  packages/*/dist/ mis à jour
build apps ✗     →  apps/*/build/ = ancien code
scp apps/*/build/*  →  l'ancien code est déployé
```

---

## Debug — Checklist quand "le fix n'est pas en prod"

1. **Le build local est-il à jour ?**
   ```bash
   ls -la apps/composer/build/index.js   # date de modification
   ```

2. **Le fichier déployé correspond-il au build local ?**
   ```bash
   sha256sum apps/composer/build/index.js
   ssh bot "sha256sum /opt/webmcp-demos/composer/index.js"
   ```

3. **Y a-t-il des erreurs JS côté client ?**
   ```bash
   # Via Playwright (headless)
   node -e "
   const {chromium} = require('playwright');
   (async () => {
     const b = await chromium.launch();
     const p = await b.newPage();
     p.on('pageerror', e => console.error('JS ERROR:', e.message));
     await p.goto('https://demos.hyperskills.net/composer/');
     await p.waitForTimeout(3000);
     await b.close();
   })();"
   ```

4. **Le service a-t-il redémarré avec le bon fichier ?**
   ```bash
   ssh bot "systemctl status webmcp-composer --no-pager | head -20"
   ```

---

## Tests — Playwright

Les tests e2e sont dans `tests/e2e/smoke.spec.ts`. Ils testent les apps
déployées sur `https://demos.hyperskills.net`.

```bash
npx playwright test                    # tous les tests
npx playwright test --grep "Composer"  # une suite
npx playwright test --grep "export"    # un test précis
```

**Quand lancer les tests** :
- Après chaque deploy important
- Avant de marquer un bug comme résolu
- Après un refactor qui touche plusieurs composants

**Ce que les tests ne vérifient pas** :
- Que le code déployé correspond au code local (→ sha256)
- Les erreurs JS silencieuses côté client (→ ajouter `page.on('pageerror')`)
- Les loops réactives Svelte qui n'affectent pas les sélecteurs CSS testés

**Attention à l'hydratation SvelteKit** : les composants SSR sont dans le DOM
dès le chargement, mais les event handlers Svelte ne sont attachés qu'après
hydratation JS. Un `page.click()` immédiat après `page.goto()` peut frapper
un bouton non-hydraté.

```ts
// ❌ peut cliquer avant hydratation
await page.goto(url);
await page.click('button:has-text("export")');

// ✅ attendre un élément client-side (seulement visible après hydratation)
await page.goto(url);
await page.waitForSelector('select', { state: 'visible' });
await page.waitForTimeout(500);   // tick d'hydratation
await page.click('button:has-text("export")');
```

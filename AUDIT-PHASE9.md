# Audit Phase 9 — Code Review Report

Date: 2026-04-11

---

## packages/core/src/webmcp-server.ts

```
[LOGIQUE] webmcp-server.ts:26-28 — WidgetRenderer type union avec `unknown` rend le type inutile
  Le type `WidgetRenderer` est `((container, data) => void | (() => void)) | unknown`.
  `T | unknown` se simplifie en `unknown` en TypeScript — le type perd toute valeur.
  Cela signifie que n'importe quoi peut etre passe comme renderer sans erreur de type.
  Fix propose: Remplacer `unknown` par un type plus specifique, ex:
    `| { new(...args: any[]): any }` ou `| ComponentType<any>` ou un brand type.
    Au minimum: `| Record<string, unknown>` pour conserver un objet.
```

```
[LOGIQUE] webmcp-server.ts:297-301 — mountWidget ne cherche que les renderers function, ignore les components framework
  La boucle ne retourne un renderer que si `typeof widget.renderer === 'function'`.
  Or les composants Svelte compiles sont aussi des fonctions. Et les composants React
  sont egalement des fonctions (ou classes, qui sont `typeof === 'function'`).
  Donc mountWidget va AUSSI appeler un composant React/Svelte comme une vanilla function,
  en lui passant (container, data) — ce qui va crasher silencieusement ou produire un rendu errone.
  Fix propose: Ajouter la meme heuristique que WidgetRenderer.svelte (check prototype)
  ou passer un flag explicite `vanilla: true` sur les renderers vanilla.
```

```
[BUG] webmcp-server.ts:82-83 — Le parsing du body apres frontmatter casse si le closing `---` est suivi de `\r\n`
  `trimmed.slice(endIdx + 4)` suppose que le closing est exactement `\n---\n` (4 chars).
  Mais `endIdx` pointe sur le `\n` avant `---`, donc on saute `\n---` = 4 chars.
  Si le fichier a des fins de ligne CRLF, le body commencera par `\r\n` au lieu de `\n`.
  Le `.replace(/^\n/, '')` ne retire que `\n`, pas `\r\n`.
  Fix propose: Utiliser `.replace(/^\r?\n/, '')` pour gerer les deux cas.
```

```
[MINEUR] webmcp-server.ts:318-319 — generateId() peut produire des collisions
  `Math.random().toString(36).slice(2, 8)` = 6 chars base36 = ~2 milliards de combinaisons.
  Pour un usage widget (faible volume), c'est acceptable, mais pas collision-proof.
  Fix propose: Aucun changement critique necessaire, mais documenter la limitation.
```

---

## packages/agent/src/tool-layers.ts

```
[BUG] tool-layers.ts:137 — toolAliasMap est un singleton global mutable, partage entre toutes les sessions
  Si deux agent loops tournent en parallele (ex: SSR + client, ou deux onglets
  avec des serveurs MCP differents), ils ecrasent mutuellement le toolAliasMap
  via clear() dans buildSystemPrompt() (ligne 199) et buildDiscoveryTools().
  Cela peut router un outil vers le mauvais serveur.
  Fix propose: Rendre toolAliasMap local a chaque agent loop (le passer en parametre
  ou le retourner comme partie du resultat de buildSystemPrompt/buildDiscoveryTools).
```

```
[LOGIQUE] tool-layers.ts:199+315 — buildSystemPrompt() et buildDiscoveryTools() remplissent TOUS DEUX le toolAliasMap
  runAgentLoop appelle buildDiscoveryTools() ligne 138 puis buildSystemPrompt() ligne 139.
  buildSystemPrompt() fait toolAliasMap.clear() en premier — cela efface les aliases
  enregistres par buildDiscoveryTools() juste avant.
  Cependant, buildSystemPrompt() re-enregistre les memes aliases, donc en pratique
  ca fonctionne. Mais si l'ordre d'appel changeait, les aliases discovery seraient perdus.
  Fix propose: Consolider le remplissage du toolAliasMap dans une seule fonction,
  ou documenter explicitement que buildSystemPrompt() est le "source of truth" pour les aliases.
```

```
[LOGIQUE] tool-layers.ts:100-109 — Layer 2 ne teste que les paires adjacentes (action, resource)
  Pour un outil nomme `list_all_recipes`, les tokens sont [list, all, recipes].
  La paire (list, all) ne matche pas, mais (all, recipes) ne matche pas non plus
  car "all" n'est pas dans SEARCH_ACTIONS ni GET_ACTIONS.
  La paire correcte (list, recipes) n'est jamais testee car elles ne sont pas adjacentes.
  Fix propose: Tester toutes les combinaisons (action, resource) au lieu des seules
  paires adjacentes: `for (const a of tokens) for (const r of tokens) matchRole(a, r)`.
```

```
[QUALITE] tool-layers.ts:250-268 — Le prompt systeme est entierement en francais
  Le prompt contient des instructions en francais ("Tu es un assistant IA...").
  Si le LLM est utilise en anglais par un utilisateur anglophone, le prompt
  francais peut degrader la qualite des reponses ou surprendre.
  Fix propose: Rendre la langue du prompt configurable, ou au minimum documenter
  que le prompt est en francais par design.
```

```
[LOGIQUE] tool-layers.ts:250-268 — Le prompt systeme reference des outils sans prefixe
  Les instructions disent "Appelle widget_display()" mais les vrais noms d'outils
  sont prefixes: `autouivanilla_webmcp_widget_display`. Les noms affiches dans
  `actionTools` sont bien prefixes (ligne 245), mais le texte du prompt (ligne 268:
  "Sauf indication contraire d'une recette, utilise ces outils pour l'affichage de l'UI")
  est coherent car il liste les noms prefixes via interpolation.
  Pas de bug, mais verifier que le LLM utilise bien les noms prefixes.
  Fix propose: Aucun, mais surveiller dans les logs si le LLM appelle "widget_display" sans prefixe.
```

---

## packages/agent/src/loop.ts

```
[LOGIQUE] loop.ts:253-265 — L'activation de serveur se fait AVANT la resolution d'alias
  Quand le LLM appelle un tool avec un nom canonique (ex: `server_mcp_search_recipes`),
  le code d'activation (ligne 254) parse CE nom pour extraire serverName/protocol.
  Mais le nom reel est peut-etre `server_mcp_browse_skills` (via alias).
  L'activation utilise serverName+protocol, pas le nom de l'outil, donc ca fonctionne:
  le serveur est active correctement. Pas de bug.
  Fix propose: Aucun, l'implementation est correcte.
```

```
[LOGIQUE] loop.ts:311-319 — Le handling du canvas tool utilise une cascade de fallback fragile
  `(actionParams?.x ?? (block.input as any).x)` — cela suppose que les params
  peuvent etre soit dans `params.x` soit directement dans l'input root.
  Si le LLM envoie `{ action: "move", id: "w_abc", x: 10, y: 20 }` (flat)
  au lieu de `{ action: "move", id: "w_abc", params: { x: 10, y: 20 } }`,
  les deux formats fonctionnent grace au fallback, ce qui est bien.
  Mais si aucun x/y n'est fourni, le callback recoit `undefined as number`.
  Fix propose: Ajouter une validation ou un default (0) pour x/y/width/height.
```

```
[LOGIQUE] loop.ts:325-328 — Le recall tool est intercepte APRES l'execution WebMCP
  Le code appelle d'abord `webmcpServer.executeTool('recall', block.input)` (lignes 295-297)
  qui va echouer car 'recall' n'est probablement pas un vrai tool du serveur WebMCP.
  Ensuite (ligne 325), le resultat est ecrase par le contenu du resultBuffer.
  Donc la premiere execution leve potentiellement une erreur qui est silencieusement ignoree.
  Fix propose: Intercepter 'recall' AVANT l'appel a executeTool, ou ajouter 'recall'
  comme outil explicite dans le serveur WebMCP.
```

```
[LOGIQUE] loop.ts:42-61 — compressOldToolResults mute les messages in-place malgre le shallow clone ligne 148-150
  Le shallow clone de initialMessages (ligne 148) clone les message objects et content arrays,
  mais les ContentBlock objects dans les arrays ne sont pas clones. Donc compressOldToolResults
  mute les blocks originaux partages avec le caller.
  Fix propose: Soit cloner profondement les content blocks, soit documenter cette mutation intentionnelle.
  Le commentaire "mutates messages in-place intentionally" est present mais ne mentionne pas
  l'impact sur initialMessages du caller.
```

```
[QUALITE] loop.ts:173-175 — Stripping des discovery tools apres 4 iterations sans render
  Cette heuristique (retirer search_recipes/get_recipe) peut empecher le LLM de trouver
  le bon widget s'il a d'abord explore des pistes incorrectes. 4 iterations est assez agressif.
  Fix propose: Augmenter le seuil a 6, ou rendre configurable via options.
```

---

## packages/sdk/src/stores/canvas.ts

```
[LOGIQUE] canvas.ts:352 — canvasVanilla est un singleton module-level, problematique en SSR
  Svelte/SvelteKit fait du SSR. `createCanvasVanilla()` s'execute au chargement du module,
  y compris cote serveur. Les fonctions `loadFromParam`/`loadFromUrl` utilisent `atob()`
  qui n'existe pas en Node < 16 sans polyfill, et `encode`/`decode` de 'hyperskills'
  peuvent avoir des dependances browser.
  Fix propose: Garder le singleton mais le lazy-initialiser, ou verifier que les deps
  fonctionnent en SSR.
```

```
[LOGIQUE] canvas.ts:243-246 — Fallback legacy base64 utilise escape/unescape deprecies
  `decodeURIComponent(escape(atob(b64)))` utilise `escape()` qui est deprecie.
  Ce pattern fonctionne pour decoder de l'UTF-8 encode en base64, mais `escape()`
  peut etre retire des navigateurs futurs.
  Fix propose: Utiliser TextDecoder: `new TextDecoder().decode(Uint8Array.from(atob(b64), c => c.charCodeAt(0)))`.
```

```
[MINEUR] canvas.ts:18 — Le type WidgetType est une union fermee de strings
  Les widget packs ajoutent de nouveaux types (sunburst, chord, contour, etc.)
  qui ne sont pas dans cette union. Le type WidgetType ne les couvre pas.
  En pratique, `addWidget()` accepte `WidgetType` mais les packs externes
  definissent des types non listes ici.
  Fix propose: Ajouter `| (string & {})` pour permettre l'extension tout en gardant
  l'autocompletion sur les types connus, ou transformer en string.
```

---

## packages/sdk/src/stores/canvas.svelte.ts

```
[LOGIQUE] canvas.svelte.ts:37-52 — Le subscribe est appele au top-level sans $effect
  canvasVanilla.subscribe() est appele directement dans createCanvas(), pas dans un
  $effect ou onMount. En Svelte 5, les assignations $state hors d'un contexte reactif
  devraient fonctionner (c'est du code module), mais le unsubscribe n'est jamais appele.
  Le singleton vit pour toute la duree de l'app, donc pas de fuite memoire en pratique,
  mais si createCanvas() etait appele plusieurs fois, chaque instance s'abonnerait sans cleanup.
  Fix propose: Documenter que createCanvas() ne doit etre appele qu'une fois (singleton pattern).
```

```
[QUALITE] canvas.svelte.ts:83 — .bind(canvasVanilla) est inutile pour les methodes qui ne lisent pas `this`
  Les fonctions comme addWidget, removeBlock, etc. sont des closures dans createCanvasVanilla()
  et ne referencent pas `this`. Le `.bind(canvasVanilla)` ne change rien car `canvasVanilla`
  est un object literal, pas une classe.
  Fix propose: Retirer les `.bind()` pour la clarte. Pas de bug.
```

---

## packages/ui/src/widgets/WidgetRenderer.svelte

```
[BUG] WidgetRenderer.svelte:132-138 — Heuristique vanilla vs Svelte Component fragile
  `Object.getPrototypeOf(customRenderer) === Function.prototype` est utilise pour detecter
  si un renderer est une "plain function" (vanilla) vs un composant Svelte.
  Mais:
  - Les arrow functions ont `Object.getPrototypeOf(fn) === Function.prototype` — OK
  - Les fonctions `async function` aussi — OK
  - Les composants Svelte 5 compiles en mode client sont des fonctions regulieres
    (pas des classes) — FAUX POSITIF, un composant Svelte pourrait etre traite comme vanilla.
  - Les classes ES6 ont `Object.getPrototypeOf(Cls) !== Function.prototype` — OK pour les exclure.
  En pratique, les composants Svelte 5 sont compiles en objets avec des proprietes specifiques,
  pas en plain functions, donc l'heuristique devrait fonctionner. Mais c'est fragile.
  Fix propose: Ajouter un flag explicite `widget.vanilla = true` sur les WidgetEntry
  au lieu de deviner a runtime.
```

```
[LOGIQUE] WidgetRenderer.svelte:106-107 — busId genere avec Date.now() peut creer des IDs instables
  Si le composant est recree (ex: dans un {#each} avec key change), le busId change.
  L'ancien busId reste dans le bus registry jusqu'au onDestroy de l'ancienne instance,
  mais pendant un court moment les deux coexistent.
  Fix propose: Utiliser l'id prop quand disponible (deja fait via `id ?? ...`), sinon
  considerer un ID plus deterministe base sur type + index.
```

```
[LOGIQUE] WidgetRenderer.svelte:147-158 — $effect sur isVanillaRenderer + vanillaContainer + data
  L'$effect se re-execute a chaque changement de `data`. Cela signifie que chaque update
  de props `data` detruit et recree le vanilla renderer (innerHTML = '', re-appel du renderer).
  Pour des widgets lourds (D3, Three.js), c'est couteux — un update incremental serait preferable.
  Fix propose: Passer par un systeme update vs full-render, ex: appeler un `update(data)` si
  le renderer le supporte, sinon full re-render.
```

---

## packages/ui/src/widgets/BlockRenderer.svelte

```
[QUALITE] BlockRenderer.svelte — Thin wrapper correct, aucun probleme.
```

---

## packages/widgets-vanilla/src/server.ts

```
[LOGIQUE] server.ts:950 — Le serveur s'appelle 'autouivanilla' mais les autres packs n'ont pas de convention de nommage
  Le nom 'autouivanilla' sera utilise comme prefixe dans les noms d'outils:
  `autouivanilla_webmcp_widget_display`. Les autres serveurs utilisent 'd3', 'threejs',
  'canvas2d', etc. Si deux serveurs enregistrent le meme widget type (ex: 'map'),
  le premier trouve gagne (dans mountWidget). L'ordre de recherche depend de l'ordre
  du tableau `servers`.
  Fix propose: Documenter l'ordre de priorite, ou utiliser un namespace dans les widget names.
```

```
[QUALITE] server.ts:39-944 — Recettes inlinees dans le code TypeScript
  Les 25 widget recipes sont inlinees comme strings template dans le fichier.
  C'est fonctionnel mais rend le fichier tres long (~960 lignes).
  Les autres packs (d3, threejs, etc.) importent les recipes depuis des fichiers .md?raw.
  Fix propose: Migrer vers des fichiers .md separes pour la coherence inter-packs.
```

---

## packages/widgets-d3/src/server.ts

```
[QUALITE] server.ts:1 — @ts-nocheck desactive toute verification TypeScript
  Le fichier entier est exclu du type-checking. Les erreurs de type dans les imports
  ou les appels registerWidget ne seront pas detectees.
  Fix propose: Retirer @ts-nocheck et fixer les erreurs de type (probablement
  liees au cast de renderer type).
```

```
[LOGIQUE] server.ts:37 — Le type du tableau widgets est Array<[string, unknown]>
  Le second element est type `unknown` au lieu de WidgetRenderer. Cela perd le type-safety
  sur les renderers. Combine avec @ts-nocheck, aucune erreur ne sera detectee si un
  renderer a la mauvaise signature.
  Fix propose: Typer comme Array<[string, WidgetRenderer]> et retirer @ts-nocheck.
```

---

## packages/widgets-threejs/src/server.ts

```
[QUALITE] server.ts — Propre, pas de @ts-nocheck. Bon pattern d'enregistrement.
  Aucun probleme detecte.
```

---

## packages/widgets-canvas2d/src/server.ts

```
[QUALITE] server.ts — Factory pattern propre, pas de probleme. Bonne separation.
```

---

## packages/widgets-canvas2d/src/utils.ts

```
[BUG] utils.ts:177-193 — tooltipEl est un singleton module-level, partage entre toutes les instances de widgets
  Si deux widgets canvas2d sont affiches simultanement et l'un appelle hideTooltip(),
  le tooltip de l'autre disparait aussi. De plus, le tooltip n'est jamais retire du DOM
  quand tous les widgets sont detruits.
  Fix propose: Soit retourner un objet tooltip par widget (factory pattern),
  soit ajouter un compteur de references et nettoyer le DOM element quand le dernier
  widget est detruit.
```

---

## packages/widgets-leaflet/src/server.ts

```
[QUALITE] server.ts — Propre, meme pattern que threejs. Aucun probleme.
```

---

## packages/widgets-plotly/src/server.ts

```
[QUALITE] server.ts:1 — @ts-nocheck, meme probleme que widgets-d3.
  Fix propose: Retirer @ts-nocheck.
```

---

## packages/widgets-plotly/src/plotly-utils.ts

```
[QUALITE] plotly-utils.ts:1 — @ts-nocheck.
  Fix propose: Retirer et fixer les types.
```

```
[MINEUR] plotly-utils.ts:12-14 — loadPlotly() cache l'import mais ne gere pas l'erreur de chargement
  Si `import('plotly.js-dist-min')` echoue (ex: package non installe), _plotly reste null
  et les appels subsequents relanceront l'import. C'est acceptable mais un peu wasteful.
  Fix propose: Cacher la Promise elle-meme pour eviter les imports multiples en cas d'erreur.
```

---

## packages/widgets-mermaid/src/server.ts

```
[QUALITE] server.ts — Propre, pas de @ts-nocheck. Aucun probleme.
```

---

## packages/widgets-mermaid/src/widgets/shared.ts

```
[LOGIQUE] shared.ts:16 — mermaidReady est un flag module-level sans reset possible
  Si mermaid.initialize() est appele avec `theme: 'dark'` et que plus tard on veut
  changer le theme, il n'y a pas de moyen de re-initialiser.
  Fix propose: Passer le theme en parametre et re-initialiser si change.
  En pratique, tous les widgets utilisent 'dark', donc pas un vrai probleme aujourd'hui.
```

---

## packages/widgets-mapbox/src/server.ts

```
[QUALITE] server.ts — Propre. Aucun probleme.
```

---

## packages/widgets-mapbox/src/widgets/mapbox-map.ts

```
[LOGIQUE] mapbox-map.ts:10-15 — injectCss contient du code mort
  Le ternaire `(container.getRootNode() as Document | ShadowRoot).appendChild ? document.head.appendChild(link) : document.head.appendChild(link)`
  fait la meme chose dans les deux branches. Le code semble avoir ete un brouillon
  pour supporter Shadow DOM mais n'a pas ete finalise.
  Fix propose: Simplifier en `document.head.appendChild(link)`.
```

```
[LOGIQUE] mapbox-map.ts:37 — center est type [number, number] mais les markers utilisent { lng, lat }
  Le parametre `center` est un tuple `[lng, lat]` (convention Mapbox) mais les markers
  sont des objets `{ lng, lat }`. L'incoherence de format peut surprendre les utilisateurs du widget.
  Fix propose: Documenter la convention ou accepter les deux formats pour center.
```

---

## packages/widgets-mui/src/server.ts

```
[QUALITE] server.ts:1 — @ts-nocheck, meme probleme que d3 et plotly.
```

---

## packages/widgets-mui/src/mount.tsx

```
[QUALITE] mount.tsx:1 — @ts-nocheck.
```

```
[LOGIQUE] mount.tsx:12 — darkTheme est cree au chargement du module
  `createTheme()` est appele au top-level. Si le module est importe en SSR (Node.js),
  MUI peut ne pas fonctionner correctement sans DOM.
  Fix propose: Lazy-initialiser le theme dans mountReact().
```

---

## scripts/extract-facts.ts

```
[QUALITE] extract-facts.ts — Script solide avec bonne gestion d'erreurs.
  La resolution recursive des star exports et des re-exports est bien implementee.
  Aucun bug detecte.
```

```
[MINEUR] extract-facts.ts:51-56 — Liste PACKAGES hardcodee, ne couvre pas les widget packs
  Les 9 widget packs ne sont pas dans la liste. Le script n'extrait que les facts
  de core, agent, sdk, ui. C'est probablement intentionnel (les widget packs n'ont
  pas d'API complexe), mais a documenter.
  Fix propose: Ajouter un commentaire expliquant pourquoi seuls 4 packages sont analyses.
```

---

## scripts/generate-diagrams.ts

```
[MINEUR] generate-diagrams.ts:149 — Regex pour extraire params/return type fragile
  `exp.signature.match(/\(([^)]*)\)\s*(?:=>|:)\s*(.+)$/)` ne gere pas les signatures
  avec des parentheses imbriquees dans les types de parametres,
  ex: `(fn: (a: number) => void): string`.
  Fix propose: Utiliser un parsing plus robuste ou tronquer le match.
```

---

## scripts/render-diagrams.ts

```
[QUALITE] render-diagrams.ts — Simple et correct.
  Utilise `npx mmdc` qui suppose que @mermaid-js/mermaid-cli est installe.
  Si ce n'est pas le cas, l'erreur sera claire. Aucun probleme.
```

---

## scripts/generate-prose.ts

```
[QUALITE] generate-prose.ts — Bien structure avec dry-run, bonne gestion API key.
  Aucun bug detecte.
```

```
[MINEUR] generate-prose.ts:54 — MODEL hardcode a claude-haiku-4-5-20251001
  Le modele est fige dans le code. Un parametre CLI ou variable d'environnement
  serait plus flexible.
  Fix propose: `const MODEL = process.env.DOCS_MODEL ?? 'claude-haiku-4-5-20251001'`.
```

---

## scripts/generate-docs.pipeline.ts

```
[QUALITE] generate-docs.pipeline.ts — Orchestrateur simple et correct.
  Aucun probleme detecte.
```

---

## Resume par severite

| Severite | Nombre | Fichiers principaux |
|----------|--------|-------------------|
| BUG | 3 | webmcp-server.ts (frontmatter CRLF), tool-layers.ts (singleton global), utils.ts (tooltip singleton) |
| LOGIQUE | 12 | tool-layers.ts (Layer 2 non-adjacent, alias double-write), loop.ts (recall intercept, canvas undefined), WidgetRenderer.svelte (heuristique, $effect re-render), canvas.ts (SSR, WidgetType ferme) |
| QUALITE | 10 | @ts-nocheck x4, recipes inlinees, bind inutiles, MODEL hardcode |
| MINEUR | 5 | generateId collision, escape() deprecie, PACKAGES hardcode, regex fragile, model hardcode |

### Top 3 des corrections prioritaires

1. **toolAliasMap singleton global** (tool-layers.ts:137) — Risque de race condition entre sessions paralleles. Rendre local a chaque agent loop.

2. **mountWidget ne distingue pas vanilla vs framework renderers** (webmcp-server.ts:297-301) — Risque de crash silencieux quand un composant Svelte/React est monte comme une function vanilla. Aligner avec l'heuristique de WidgetRenderer.svelte ou ajouter un flag explicite.

3. **recall tool execute puis ecrase** (loop.ts:325-328) — L'appel a executeTool('recall') va lever une erreur non geree avant d'etre ecrase par le resultBuffer. Intercepter recall avant l'appel WebMCP.

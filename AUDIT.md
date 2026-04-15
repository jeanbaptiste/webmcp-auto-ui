# Audit de code — webmcp-auto-ui

Date : 2026-04-13

## Resume

15 problemes trouves : 2 bugs, 6 logique, 5 qualite, 2 mineur

## Problemes

### [BUG] tool-layers.ts:58 + loop.ts:440 — flattenPathMaps est un singleton global non-parallel-safe

**Severite** : bug
**Description** : `flattenPathMaps` est declare comme `export const flattenPathMaps = new Map()` au niveau module (singleton global). Dans `buildToolsFromLayers` (ligne 265), il est vide avec `flattenPathMaps.clear()` puis rempli. Dans `loop.ts:440`, il est lu pour unflattener les params. Si deux agent loops tournent en parallele avec `flatten: true`, le second `buildToolsFromLayers` fait un `clear()` qui supprime les path maps du premier loop en cours d'execution. Les params du premier loop ne seront plus unflattenables, provoquant un envoi de params plats au serveur WebMCP.
**Fix propose** : Suivre le meme pattern que `toolAliasMap` / `buildDiscoveryToolsWithAliases` : retourner les pathMaps depuis `buildToolsFromLayers` et les passer en local au lieu de les stocker dans un singleton global. En attendant, documenter que `flatten: true` n'est pas parallel-safe.

### [BUG] wasm.ts:220-225 — Messages tronques sans recompiler le prompt

**Severite** : bug
**Description** : Dans `_chat()`, le code tronque `messages` (ligne 222: `messages = messages.slice(1)`) mais avait deja construit `prompt` a la ligne 217. Ensuite (ligne 225), il reconstruit le prompt. Cependant, les deux chemins de clipping (MAX_MESSAGES et token-based) reutilisent la variable locale `messages` qui masque le parametre original. Le premier clipping (MAX_MESSAGES) tronque `messages` puis reconstruit `prompt` — correct. Mais le second clipping (token-based) part de ces messages deja tronques sans le savoir. Si le premier clipping laisse exactement MAX_MESSAGES et que le prompt est encore trop long, le second clipping supprime des messages supplementaires, ce qui est le comportement voulu. En revanche, `maxTools` est passe a `buildPrompt` dans le premier appel (ligne 217) mais pas dans le second (ligne 225) — `maxTools` est omis du `buildPrompt` call post-clipping, ce qui peut inclure plus de tools dans le prompt que prevu apres le clipping.
**Fix propose** : Passer `maxTools` au deuxieme appel `buildPrompt` (ligne 225) : `prompt = this.buildPrompt(messages, tools, options?.system, options?.maxTools)`.

### [LOGIQUE] loop.ts:46-66 — compressOldToolResults ne couvre pas le dernier message-2

**Severite** : logique
**Description** : La boucle `for (let i = 0; i < messages.length - 2; i++)` compresse les messages sauf les 2 derniers. Le commentaire dit "Only compresses messages before the last 2 (current iteration)". Mais apres avoir push un assistant message + un user message (tool_results), les 2 derniers sont le message user et le message assistant. Le message user precedent (avec les tool_results de l'iteration N-1) est a `messages.length - 3`, donc il sera compresse. C'est correct en general, mais si `compressHistory` est un nombre petit (ex: 50), le preview sera tres court et le contexte du tool_result N-1 sera perdu alors que le LLM pourrait en avoir besoin pour interpreter les resultats de l'iteration N.

### [LOGIQUE] auto-repair.ts:86-89 — Double fix pour required field avec default ET single enum

**Severite** : logique
**Description** : Si un required field manquant a BOTH un `default` ET un `enum` avec un seul element, les deux fixes s'appliquent sequentiellement. Le premier set `params[req] = propSchema.default`, puis le second overwrite avec `params[req] = enum[0]`. Le fix log les deux messages. Si `default !== enum[0]`, le second overwrite silencieusement le default, ce qui peut etre incorrect. De plus, le check `if (!(req in params))` au debut du bloc ne protege pas le second fix car `params[req]` existe deja apres le premier fix.
**Fix propose** : Ajouter un `else if` pour que seul le premier fix applicable s'execute, ou ajouter `if (!(req in params))` avant le check enum.

### [LOGIQUE] wasm.ts:529-547 — parseGemmaArgs regex pour objets imbriques peut capturer trop tot

**Severite** : logique
**Description** : Le regex `objRe = /(\w+)\s*:\s*([{\[])/g` pour les objets/arrays imbriques fait un matching de balanced braces, mais le counter `depth` incremente sur `{`, `[`, `}`, `]` indistinctement du type d'ouverture. Ex: si le fragment est `{items:[1,2,3}`, un `}` ferme un `[`, ce qui produit un parse incorrect. De plus, la ligne 538 `if (ch === opener || ch === '{' || ch === '[') depth++` double-compte si `opener` est deja `{` ou `[`.
**Fix propose** : Utiliser un stack de caracteres au lieu d'un simple compteur de profondeur, ou au minimum ne pas double-compter `opener`.

### [LOGIQUE] diagnostics.ts:105-115 — Diagnostic re-sanitize les schemas deja sanitizes

**Severite** : logique
**Description** : `runDiagnostics` recoit les `tools` qui ont deja ete passes par `sanitizeSchemaWithReport` lors de la construction par `toProviderTools`/`buildToolsFromLayers`. Le check #5 (ligne 105) re-sanitize chaque schema pour detecter les patches. Mais les schemas sont deja sanitizes, donc `sanitizeSchemaWithReport` ne trouvera quasiment jamais de patches (tout a deja ete nettoye). Ce diagnostic est toujours faux-negatif.
**Fix propose** : Faire tourner le check sur les schemas originaux (pre-sanitize), pas sur les `ProviderTool[]` deja transformes. Ou retirer ce check redondant.

### [LOGIQUE] loop.ts:374 — Re-parsing du tool name avec un nouveau regex sur `block.name` au lieu de `resolvedName`

**Severite** : logique
**Description** : A la ligne 374, le code fait `const activateMatch = block.name.match(...)` pour activer le serveur. Mais `block.name` pourrait etre un alias (canonical name), et c'est `resolvedName` (ligne 323) qui est le vrai nom. Si un alias est utilise et que le prefix du server dans le alias differe du prefix dans `resolvedName`, le serveur ne sera pas correctement active. En pratique, les aliases ont le meme prefix (`{prefix}search_recipes` → `{prefix}real_tool_name`), donc ce bug ne se manifeste pas actuellement. Mais c'est fragile.
**Fix propose** : Utiliser `resolvedName` au lieu de `block.name` pour le `activateMatch`.

### [LOGIQUE] loop.ts:485-486 — toolMatch2 recalcule un regex deja resolu

**Severite** : logique
**Description** : A la ligne 485, `resolvedName.match(/^(.+?)_(mcp|webmcp)_(.+)$/)` est recalcule alors que `toolMatch` (ligne 327) contient deja le meme resultat pour `resolvedName`. C'est du code redondant sans risque de bug, mais pourrait utiliser `toolMatch` directement. En fait, `toolMatch` est calcule a partir de `resolvedName` (ligne 327) et `toolMatch2` aussi (ligne 485) — c'est exactement la meme chose.
**Fix propose** : Utiliser `toolMatch` directement au lieu de recalculer `toolMatch2`.

### [QUALITE] tool-layers.ts:178 — toolAliasMap global deprecated mais toujours exporte et rempli

**Severite** : qualite
**Description** : `toolAliasMap` est marque `@deprecated` mais exporte dans `index.ts` et rempli comme side-effect par `buildSystemPrompt()` et `buildDiscoveryTools()`. Les 5 apps appellent toutes `buildSystemPrompt` (non-parallel-safe) dans leurs `$derived`. En mode single-tab c'est inoffensif car un seul agent loop tourne a la fois. Mais le code donne une fausse impression de parallelisme-safe via le pattern `WithAliases`.
**Fix propose** : Migrer les apps vers `buildSystemPromptWithAliases()` pour la derivation du prompt et stopper le remplissage du singleton global. Ou au minimum, ajouter un warning console quand `buildSystemPrompt` est appele.

### [QUALITE] webmcp-server.ts:330 — sanitizeImageUrls supprime silencieusement les URLs sans log

**Severite** : qualite
**Description** : Quand `sanitizeImageUrls` detecte une URL image invalide (ligne 329-330), elle la supprime silencieusement (le champ n'est pas inclus dans `result`). Le commentaire dit "Keep the key but set to undefined", mais en realite le `continue` ou l'absence de `result[key]` fait que la cle disparait completement. L'intention est correcte (supprimer les URLs hallucinees), mais l'absence de log rend le debug impossible quand un widget affiche les initiales au lieu d'un avatar et que l'utilisateur ne comprend pas pourquoi.
**Fix propose** : Ajouter un log `console.debug` quand une URL est strippee, ou retourner un rapport de sanitization.

### [QUALITE] wasm.ts:17-19 — LITERT_MODELS hardcoded sans mecanism de mise a jour

**Severite** : qualite
**Description** : Les tailles des modeles (`size: 2_003_697_664` etc.) et les repos HuggingFace sont hardcodes. Si un modele est mis a jour (taille differente), le check de cache OPFS (ligne 115: `Math.abs(file.size - total) < total * 0.01`) invalidera le cache et re-telechargera inutilement, ou pire, acceptera un fichier corrompu de taille similaire.
**Fix propose** : Utiliser un hash SHA256 pour la validation du cache au lieu de la comparaison de taille.

### [QUALITE] webmcp-server.ts:219 — webmcpToProviderTools fallback schema sans additionalProperties

**Severite** : qualite
**Description** : Le fallback schema dans `webmcpToProviderTools` (ligne 219) est `{ type: 'object', properties: {} }` — sans `additionalProperties: false`. Quand `sanitize` est actif (defaut), `sanitizeSchemaWithReport` l'ajoutera. Mais si un consommateur desactive sanitize (`{ sanitize: false }`), le schema sera envoye sans `additionalProperties`, ce qui peut causer des erreurs avec l'API Anthropic en mode strict. Compare avec `toProviderTools` (ligne 194) qui inclut `additionalProperties: false` dans le fallback.
**Fix propose** : Ajouter `additionalProperties: false` au fallback schema de `webmcpToProviderTools`.

### [QUALITE] loop.ts:220-228 — Nudge message en francais pour une codebase multilingue

**Severite** : qualite
**Description** : Le nudge "tu n'as pas encore affiche de resultat visuel" (ligne 292) est en francais, tandis que le nudge anglais "STOP exploration" (ligne 217) est en anglais. Le system prompt est en francais. Les deux nudges devraient etre dans la meme langue que le system prompt pour la coherence du contexte LLM.
**Fix propose** : Uniformiser la langue des nudges (tout en francais ou tout en anglais, selon la locale).

### [MINEUR] loop.ts:12 — Imports inutilises : buildSystemPrompt, buildDiscoveryTools

**Severite** : mineur
**Description** : `buildSystemPrompt` et `buildDiscoveryTools` sont importes dans `loop.ts` mais jamais appeles directement dans le fichier (seules les variantes `WithAliases` sont utilisees). `buildSystemPrompt` est re-exporte (ligne 19) mais les autres sont des dead imports.
**Fix propose** : Retirer `buildDiscoveryTools` de l'import. Garder `buildSystemPrompt` uniquement pour le re-export.

### [MINEUR] quantizer-bridge.ts:19 — Singleton module-level sans destroy/reset

**Severite** : mineur
**Description** : `let instance: QuantizerInstance | null = null` est un singleton module-level. `loadQuantizer()` le cree une fois. Il n'y a pas de fonction `destroyQuantizer()` pour liberer le WASM instance. En pratique, le WASM est petit et le bridge vit pour la duree de la session, donc c'est inoffensif. Mais si le module est importe dans des tests qui font du cleanup, il fuit.
**Fix propose** : Ajouter une fonction `resetQuantizer()` exportee qui set `instance = null`.

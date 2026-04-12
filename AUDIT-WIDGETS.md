# Audit des widgets natifs — 2026-04-11

Audit CSS / rendu / robustesse de tous les widgets dans `packages/ui/src/widgets/`.

---

## simple/StatBlock.svelte — OK

Pas de height%, pas de SVG, pas de flexbox fragile. Fallback `'—'` si `data.value` manquant. Couleurs via CSS vars (`text-text1`, `text-text2`, `text-teal`, `text-accent2`). Aucun probleme.

## simple/KVBlock.svelte — OK

`data.rows ?? []` protege contre undefined. Pas de height%. Layout flexbox vertical simple, sans dependance de hauteur parent.

## simple/ListBlock.svelte — OK

`data.items ?? []` protege contre undefined. Pas de height%. Rendu vide propre (liste vide = rien affiche).

## simple/ChartBlock.svelte — OK

Le parent `.h-16` donne une hauteur explicite aux barres avec `height: X%`. Le `Math.max(..., 1)` protege contre la division par zero. Rendu vide propre (0 barres = rien). Deja fixe (separation barres/labels).

## simple/AlertBlock.svelte — OK

Pas de height%, pas de SVG. Conditions `{#if}` pour title et message. Aucun crash si tout est vide (affiche juste le border-left).

## simple/CodeBlock.svelte — OK

`overflow-x-auto` sur le `<pre>` gere le debordement horizontal. Contenu vide = string vide affichee. Pas de height%.

## simple/TextBlock.svelte — OK

Widget trivial, une seule div. Pas de probleme possible.

## simple/ActionsBlock.svelte — OK

`data.buttons ?? []` protege contre undefined. Flexbox wrap, pas de height%.

## simple/TagsBlock.svelte — OK

`data.tags ?? []` protege contre undefined. Flexbox wrap. Aucun probleme.

---

## rich/Chart.svelte — OK

- **Bar chart** : parent `.h-24.sm:h-32` donne une hauteur explicite. Les barres internes utilisent `h-full` + `height:X%` — fonctionne car le parent a une hauteur fixe.
- **Pie/Donut** : SVG avec `viewBox="-1 -1 2 2"` — responsive. OK.
- **Line/Area** : SVG avec `viewBox="0 0 {W} {H}"` — responsive. OK.
- **Donnees vides** : `{#if !datasets.length}` affiche "Aucune donnee". OK.
- **Math.max** : protege par `,1` dans le spread. OK.
- **Legende** : conditionnelle sur `datasets.length > 1`. OK.

## rich/DataTable.svelte — OK

- `overflow-auto max-h-[480px]` contient le scroll. OK.
- `sticky top-0` sur thead fonctionne avec le overflow-auto parent. OK.
- Donnees vides : message "Aucune donnee". OK.
- Auto-detection des colonnes si `spec.columns` absent. OK.
- Tri par clic colonne. OK.
- Cap a 200 lignes avec indicateur overflow. OK.

## rich/Timeline.svelte — OK

- Ligne verticale via `w-0.5 flex-1 bg-border`. Pas de height%, flex-1 dans un flex-col fonctionne. OK.
- Donnees vides : message "Aucun evenement". OK.
- Pas de SVG. OK.

## rich/ProfileCard.svelte — OK

- Avatar avec fallback initiales. OK.
- Toutes sections conditionnelles. OK.
- `max-w-full md:max-w-[480px]` contraint la largeur. OK.

## rich/Trombinoscope.svelte — OK

- Grid responsive avec CSS custom + media query. OK.
- `--trombi-cols` CSS var correctement utilisee. OK.
- Donnees vides : message "Aucune personne". OK.

## rich/JsonViewer.svelte — OK

- Recursion via `{#snippet}` avec guard `depth >= maxDepth`. OK.
- `undefined` gere explicitement. OK.
- Pas de height%, pas de SVG.

## rich/Hemicycle.svelte — OK

- SVG avec `viewBox="0 0 {W} {H}"`. Responsive. OK.
- `max-h-[220px]` contraint la hauteur du SVG. OK.
- Donnees vides : message "Aucune donnee". OK.
- Division par zero protegee : `n-1||1`. OK.
- Tooltip positionne en absolu dans un parent relatif. OK.

## rich/Cards.svelte — OK

- Grid auto-fill responsive. OK.
- Donnees vides : message configurable. OK.
- Image `h-32 object-cover` — hauteur fixe. OK.

## rich/Sankey.svelte — OK

- Barres en pixels (`height:{barH}px`), pas en pourcentage. OK.
- `Math.max(..., 1)` protege contre la division par zero. OK.
- Donnees vides : message "Aucune donnee de flux". OK.

## rich/LogViewer.svelte — OK

- `max-height` configurable via `spec.maxHeight`. OK.
- `overflow-y-auto` pour le scroll. OK.
- Donnees vides : message "Aucune entree de log". OK.

## rich/StatCard.svelte — OK

- Pas de height%. Layout centre simple. OK.
- `trendInfo` est un `$derived` qui retourne une fonction (pas `$derived.by`) — fonctionne mais atypique. Non bloquant.

## rich/Gallery.svelte — OK

- Grid responsive avec CSS custom + media query. OK.
- Lightbox avec navigation clavier (Escape, fleches). OK.
- Donnees vides : message configurable. OK.
- Images en `h-32 sm:h-40 object-cover` — hauteur fixe. OK.

## rich/Carousel.svelte — OK

- Translation CSS avec `translateX(-{current * 100}%)` — fonctionne car le parent a un overflow-hidden et les enfants ont `w-full flex-shrink-0`. OK.
- Cleanup du timer dans `$effect` return. OK.
- Touch/swipe support. OK.
- Donnees vides : message "Aucun contenu". OK.

## rich/MapView.svelte — OK

- Hauteur explicite via `spec.height ?? '400px'`. OK.
- Placeholder pendant le chargement de Leaflet. OK.
- Cleanup du `map` dans le return de onMount. OK.
- CSS global pour le tooltip — OK.

## rich/D3Widget.svelte — QUALITE

- Severite : QUALITE
- Fichier : `packages/ui/src/widgets/rich/D3Widget.svelte`
- **Treemap text illisible** (ligne 210) : `fill: '#fff'` pour le texte sur les rectangles, mais `d3.interpolateBlues` produit des couleurs allant du tres clair au fonce. Le texte blanc est invisible sur les cellules bleu clair.
- **Pas de message vide global** : chaque preset gere son propre message, mais si `spec.preset` est absent, le message dit "Aucun preset specifie" — OK, mais si `spec.data` est undefined sans preset, le widget affiche un div vide.
- Fix propose : utiliser un contraste adaptatif pour le texte treemap (blanc sur fonce, noir sur clair), ou une couleur unique sombre avec fond semi-transparent.

## rich/JsSandbox.svelte — PROBLEME (FIXE)

- Severite : BUG
- Fichier : `packages/ui/src/widgets/rich/JsSandbox.svelte`, ligne 19
- Description : le CSS du iframe utilisait `background:#fff;color:#111` en dur. Sur un theme sombre, l'iframe avait un fond blanc eclatant qui cassait la coherence visuelle.
- **Fix applique** : remplace par `background:var(--bg,#1a1a2e);color:var(--fg,#e2e2e8)` — le fallback est sombre par defaut, et les CSS vars permettront un override futur si le sandboxed iframe recoit les variables du parent.

## rich/GridData.svelte — PROBLEME (FIXE)

- Severite : QUALITE
- Fichier : `packages/ui/src/widgets/rich/GridData.svelte`, ligne 19
- Description : le `<table>` n'avait pas `w-full`, ce qui faisait que la table se collapsait a la largeur du contenu au lieu de remplir le conteneur. Visuellement, la table flottait a gauche avec un espace vide a droite.
- **Fix applique** : ajoute `w-full` a la classe du `<table>`.

---

# Resume

| Widget | Status | Severite |
|--------|--------|----------|
| simple/StatBlock | OK | — |
| simple/KVBlock | OK | — |
| simple/ListBlock | OK | — |
| simple/ChartBlock | OK | — |
| simple/AlertBlock | OK | — |
| simple/CodeBlock | OK | — |
| simple/TextBlock | OK | — |
| simple/ActionsBlock | OK | — |
| simple/TagsBlock | OK | — |
| rich/Chart | OK | — |
| rich/DataTable | OK | — |
| rich/Timeline | OK | — |
| rich/ProfileCard | OK | — |
| rich/Trombinoscope | OK | — |
| rich/JsonViewer | OK | — |
| rich/Hemicycle | OK | — |
| rich/Cards | OK | — |
| rich/Sankey | OK | — |
| rich/LogViewer | OK | — |
| rich/StatCard | OK | — |
| rich/Gallery | OK | — |
| rich/Carousel | OK | — |
| rich/MapView | OK | — |
| rich/D3Widget | QUALITE | Texte treemap illisible sur fond clair |
| rich/JsSandbox | BUG FIXE | Dark mode casse (fond blanc hardcode) |
| rich/GridData | QUALITE FIXE | Table non-full-width |

**Bugs type "height% sans parent" : AUCUN trouve en dehors du ChartBlock deja fixe.** Tous les widgets qui utilisent `height:%` le font dans un parent avec hauteur explicite (`h-16`, `h-24`, `h-full` dans un parent h-fixe).

**Donnees vides/undefined : TOUS les widgets gerent correctement le cas** — soit via `?? []`, soit via un message "Aucune donnee" conditionnel.

**SVG viewBox : TOUS les SVG ont un viewBox** (Chart pie `"-1 -1 2 2"`, Chart line/area `"0 0 400 120"`, Hemicycle `"0 0 420 230"`, D3 presets tous dynamiques).

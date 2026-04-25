# scripts/ — Deploy & batch tooling

Ce répertoire contient les scripts shell d'orchestration (deploy, batch publish) et leur infrastructure partagée dans `lib/`. La plupart des scripts `.mjs` / `.ts` (génération de doc, audits) sont indépendants — ce README couvre uniquement la chaîne **deploy / batch / progress / ETA**.

## Architecture

```
scripts/
├── deploy.sh           # Déploie une ou plusieurs apps vers la VM (rsync over ssh)
├── batch.sh            # Pipeline complet : lint → test → bump → publish → deploy → push
└── lib/
    ├── progress.sh     # Barres ANSI multi-lignes, IPC fichier, modes TTY/JSON/silent
    ├── eta.sh          # Estimation de durée (historique + signaux système)
    ├── progress-demo.sh
    └── eta-test.sh
```

### `lib/progress.sh` — barres de progression

Bibliothèque de barres ANSI multi-lignes, conçue pour fonctionner aussi bien en exécution séquentielle (un seul script) qu'en exécution parallèle (workers en `&`). Compatible bash 3.2 (macOS stock) — utilise un shim de tableaux parallèles à la place des associatifs.

Quatre modes d'affichage :

| Mode | Activation | Sortie |
|------|------------|--------|
| TTY (par défaut) | sortie attachée à un terminal | redraw in-place via `tput cup` + `tput el` |
| Non-TTY | sortie pipée ou redirigée | une ligne timestampée par tick |
| JSON | `PB_JSON=1` | events JSON (un par ligne) sur fd 3 (ou stderr si fd 3 fermé) |
| Silent | `PB_NO_PROGRESS=1` | aucun affichage en cours, juste les `done`/`fail` finaux |

**IPC fichier** : pour le mode parallèle, chaque bar a un fichier d'état dans `$PB_STATE_DIR` (auto-créé par `pb_init` sous `/tmp`). Format `pct|status|status_text|seen`. Un watcher background (`pb_watch_start`) lit ces fichiers à intervalle de 200 ms et redraw / émet du JSON dans le process parent. C'est le seul moyen pour qu'un sub-shell `(work; pb_done id) &` puisse mettre à jour la barre du parent — les variables shell ne traversent pas un fork.

### `lib/eta.sh` — estimation de durée

Maintient un historique roulant (max 20 valeurs par stage) sur disque dans `.deploy-cache/timings.json`, combiné avec des signaux système live pour prédire la durée d'un step. Math via `awk` (bash n'a pas de flottants).

Signaux système utilisés :
- **loadavg 1-min** (sysctl `vm.loadavg` sur macOS, `/proc/loadavg` sur Linux) — cache 5 s
- **mémoire libre** (vm_stat sur macOS, `free -m` sur Linux) — cache 5 s
- **ping médian** vers un host (3 pings, médian) — cache 5 min par host
- **nombre de cœurs** (`hw.ncpu` / `nproc`)

`eta_load_factor` calcule `max(1.0, loadavg / cores)` puis multiplie par 1.3 si la RAM libre est sous 1024 MB. L'estimation finale est `median(history) × load_factor`.

## Utilisation depuis un script

### Exemple minimal (séquentiel)

```bash
source scripts/lib/progress.sh
source scripts/lib/eta.sh

eta_init
pb_init
pb_register build "build viewer" 1

start=$SECONDS
pb_tick build 0
# ... travail ...
pb_done build
eta_record "deploy.viewer.build" $((SECONDS - start))

pb_finish
eta_save
```

### Exemple parallèle (workers en `&`)

Le watcher est obligatoire dès que des sub-shells mettent à jour des bars : sans lui, `pb_tick` / `pb_done` dans `(work) &` n'atteindront jamais le terminal du parent.

```bash
pb_register a "build flex" 1
pb_register b "build viewer" 1
pb_watch_start

(work_a; pb_done a) &
(work_b; pb_done b) &
wait

pb_watch_stop
pb_finish
```

### Header dynamique (CPU / load)

```bash
pb_set_header "$(pb_render_cpu_bar 2 1 4)  load $(pb_render_load_bar 1.5 4)"
```

## Variables d'environnement

| Variable | Effet |
|----------|-------|
| `PB_NO_PROGRESS=1` | Désactive l'affichage des barres (mode silent) |
| `PB_JSON=1` | Émet un event JSON par tick sur fd 3 (fallback stderr) |
| `NO_COLOR=1` | Désactive les couleurs ANSI (respecte la convention `no-color.org`) |
| `ETA_CACHE_DIR` | Override le cache d'historique (défaut `.deploy-cache/`) |
| `ETA_CACHE_FILE` | Override le fichier JSON (défaut `$ETA_CACHE_DIR/timings.json`) |

## Flags de `deploy.sh`

```
./scripts/deploy.sh [APP...] [FLAGS]
```

| Flag | Effet |
|------|-------|
| `-j N`, `--jobs N`, `--jobs=N` | Workers parallèles (défaut `min(4, nb_apps)`) |
| `--dry-run` | Simule sans toucher la VM (pas de ssh/rsync réels) |
| `--with-docs` | Lance aussi `docs-update.sh --all -y` après le deploy |
| `--force` | Ignore le cache d'empreinte (force rebuild + reupload) |
| `--no-progress` | Désactive les barres (mode legacy ligne par ligne) |
| `--quiet` | Silent (erreurs uniquement) |
| `--json` | Events JSON sur stderr |
| `--stats` | Affiche l'historique d'estimation et exit |
| `--reset-cache` | Vide `timings.json` et exit |
| `-h`, `--help` | Aide |

## Flags de `batch.sh`

```
./scripts/batch.sh [FLAGS]
```

| Flag | Effet |
|------|-------|
| `--dry-run` | Affiche les commandes sans les exécuter |
| `--no-deploy` | Skip le stage deploy |
| `--no-bump` | Skip le bump de version |
| `--no-tag` | Skip le `npm publish` (tag) |
| `--no-docs` | Skip le stage docs |
| `--message "msg"`, `-m "msg"` | Message de commit custom |
| `--no-progress` | Désactive les barres |
| `--json` | Events JSON sur stderr |
| `--quiet` | Silent (erreurs uniquement) |
| `--stats` | Affiche l'historique d'estimation et exit |
| `--reset-cache` | Vide le cache et exit |

## Format du cache `.deploy-cache/timings.json`

JSON plat : un objet à la racine, clé = nom de stage, valeur = liste des durées en secondes (FIFO, max 20 entrées).

```json
{
  "deploy.flex.build": [42, 38, 45, 41, 39],
  "deploy.flex.upload": [12, 11, 14],
  "deploy.viewer.build": [78, 81, 76],
  "batch.deploy": [180, 175],
  "batch.publish": [62]
}
```

Conventions de nommage des stages :
- `deploy.<app>.<stage>` — pour deploy.sh (`clean`, `build`, `upload`, `restart`, `healthcheck`)
- `batch.<stage>` — pour batch.sh (`pre-checks`, `commit`, `docs`, `deploy`, `push`, `bump`, `tag`, `publish`)

Un stage absent du cache fait fallback sur des défauts hardcodés dans `_eta_default_for` (par ex. `deploy.*.build` → 60 s, `deploy.*.upload` → 20 s).

Exemple de dump via `./scripts/deploy.sh --stats` :

```
STAGE                             COUNT   MEDIAN      P95   STDDEV
deploy.flex.clean                     3     0.00     0.00     0.00
deploy.flex.build                     3     0.00     1.00     0.58
deploy.flex.upload                    2     0.00     0.00     0.00
deploy.flex.restart                   3     0.00     0.00     0.00
deploy.flex.healthcheck               3     0.00     0.00     0.00
batch.deploy                          2     4.50     6.00     2.12
```

## Calibration et apprentissage

- **3 premiers runs** : ETAs marqués `(unreliable estimate)` (flag `ETA_UNRELIABLE=1` accessible via `eta_last_unreliable`)
- **Après 3-5 runs** : médiane stable, précision typique ±15 %
- **Outlier filter** : une valeur > 2 × médiane courante déclenche un warning sur stderr (`eta.sh: outlier detected ...`) mais reste stockée — l'historique reflète la réalité, c'est seulement la médiane qui est robuste
- **FIFO trim** : passé `ETA_HISTORY_MAX` (20), les plus anciennes entrées sont droppées
- **Sous-commandes utilitaires** :
  - `--stats` : voir l'historique (count, médiane, p95, stddev par stage)
  - `--reset-cache` : vider le cache d'estimation

## Dépendances

| Outil | Statut | Usage |
|-------|--------|-------|
| `bash` 3.2+ | requis | Compatible bash macOS stock ; optimal sur bash 4+ (associatifs natifs) |
| `awk`, `sed` | requis | Standard POSIX, utilisé pour la math float et le parsing |
| `tput` | requis | Détection de capacités terminal et redraw in-place |
| `flock` | recommandé | Sérialisation des writes concurrents au lock file (fallback silencieux si absent) |
| `jq` | optionnel | Parse JSON plus rapide pour `timings.json` (fallback awk si absent) |
| `pv` | optionnel | Throughput live pour les transferts rsync (un avertissement si absent) |
| `rsync`, `ssh` | requis | Pour le déploiement réel (skipped en `--dry-run`) |
| `curl` | requis | Healthcheck post-deploy |

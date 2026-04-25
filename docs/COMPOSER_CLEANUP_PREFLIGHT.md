# Composer Cleanup — Preflight (dry-run)

Date : 2026-04-21
Scope : nettoyer toute référence résiduelle à une ancienne app `composer` (et au passage, à `mobile` dans le CLAUDE.md global) + supprimer le répertoire bizarre `apps/{home,composer,todo,viewer}/`.

---

## Summary

- **Aucune app `composer` n'existe dans le monorepo** (pas de `apps/composer/`, pas de workspace, pas d'entrée dans `deploy.sh`, pas de workflow CI).
- **Aucune trace de `composer` côté VM** : pas de service systemd, pas de dir `/opt/webmcp-demos/composer*`, pas de backup, pas de nginx site, pas de mobile non plus (le cleanup mobile précédent est OK).
- Toutes les refs `composer` trouvées dans le code/docs locaux sont **légitimes** : mot générique (« composer une UI »), label UI (`composerMode` dans flex), ID de recette (`composer-tableau-de-bord-kpi`), description du rôle de l'app flex.
- **Deux nettoyages restants**, cosmétiques mais réels :
  1. Répertoire littéral `apps/{home,composer,todo,viewer}/` (artéfact d'expansion shell cassée du 6 avril, vide).
  2. Bloc `~/.claude/CLAUDE.md` global lignes 281-302 qui référence encore `composer` ET `mobile` comme apps actives.

---

## 1. App `composer` — état local (monorepo)

### Présence directe
- `apps/composer/` : **N'EXISTE PAS**.
- `package.json` racine : **aucune** référence (workspaces = home, flex, viewer, todo, showcase, recipes, boilerplate + docs/starlight ; scripts dev/build idem).
- `scripts/deploy.sh` : **aucune** référence (case statement ligne 226-238 = flex, viewer, recipes, home, todo, boilerplate, showcase).
- `.github/workflows/` (ci.yml, deploy-docs.yml, docs-sync.yml, publish.yml) : **aucune** référence à `composer` ni à `mobile`.
- `CLAUDE.md` local (projet) : **aucune** référence à `composer` comme app. La table ligne 11-18 liste flex, boilerplate, viewer, home/todo/showcase, recipes. OK.
- `README.md` : une seule occurrence, ligne 21, description textuelle de l'app flex (« Full UI composer: agent chat... »). **Légitime** (rôle fonctionnel, pas nom d'app).

### Refs textuelles trouvées (toutes légitimes)

| Fichier | Ligne(s) | Nature |
|---------|----------|--------|
| `README.md` | 21 | Description flex : « Full UI composer » (verbe/rôle) |
| `apps/flex/src/routes/+page.svelte` | 63, 1178, 1181, 1220, 1228, 1233, 1237, 1238, 1297 | Variable `composerMode` (toggle composer/consumer UI flex) |
| `apps/flex/src/lib/SettingsDrawer.svelte` | 22, 75, 271, 272, 274 | Prop `composerMode`, label UI "Composer mode" |
| `docs/agents/composing.md` | 1, 3, 124, 153 | Verbe « composer une UI » (guide agent) |
| `docs/agents/skills.md` | 23, 24, 76, 102 | ID recette `composer-tableau-de-bord-kpi` + libellé « Composer un tableau de bord KPI » |
| `docs/contributing.md` | 202 | `playwright test --grep "Composer"` (nom suite Playwright — à vérifier si suite toujours pertinente) |
| `docs/theming.md` | 313, 336 | « exported from the Composer » = rôle flex (historique) |
| `docs/tutorials/use-existing-widgets.md` | 360 | « Composer un dashboard » (verbe) |
| `docs/starlight/src/content/docs/en/apps/flex.md` | 3, 113, 115 | Description flex: mode composer/consumer |
| `docs/starlight/src/content/docs/en/guide/getting-started.mdx` | 188 | « flex/ Main SvelteKit app (composer) » |
| `docs/starlight/src/content/docs/en/guide/contributing.mdx` | 22, 223 | Même chose, FR/EN |
| `docs/starlight/src/content/docs/guide/contributing.mdx` | 223 | Idem |
| `docs/starlight/src/content/docs/en/guide/deploy.mdx` | 54 | Table deploy : « flex = Main composer » |
| `docs/starlight/src/content/docs/concepts/recipes.md` | 91, 92, 149 | ID recette |
| `docs/starlight/src/content/docs/en/concepts/recipes.md` | 149 | Idem EN |
| `docs/starlight/src/content/docs/concepts/widget-display.md` | 246 | Verbe « composer un dashboard » |
| `packages/sdk/README.md` | 52 | « composer canvas » (nom du store SDK) |
| `docs/site/index.html (supprimé — voir commit fe51f94)` | 3005, 3028, 3367, 3369, 3492, 3521, 4361, 4362, 4414, 4440 | HTML rendu des pages ci-dessus |
| `.docs-snapshot-light.txt` | 1905, 5128, 5614, 5617, 5655, 5663, 5668, 5672, 5673, 5707 | Snapshot docs (regen auto) |

**Conclusion** : toutes légitimes. Aucune à supprimer côté code/docs.

---

## 2. App `composer` — état VM (via `ssh bot`, lecture seule)

Commandes exécutées (aucune destructive) :
```bash
ls /opt/webmcp-demos/ | grep -i composer
ls /opt/webmcp-demos/.backups/ | grep -i composer
systemctl list-unit-files | grep -i composer
systemctl status composer.service
ls /etc/nginx/sites-available/ /etc/nginx/sites-enabled/ | grep -i composer
# bonus: même chose pour 'mobile' (vérif cleanup précédent)
```

Résultats :

| Cible | Résultat |
|-------|----------|
| `/opt/webmcp-demos/composer*` | (vide) |
| `/opt/webmcp-demos/.backups/composer*` | (vide) |
| `systemctl list-unit-files` (composer) | (vide) |
| `systemctl status composer.service` | `Unit composer.service could not be found` |
| nginx sites (composer) | (vide) |
| `/opt/webmcp-demos/mobile*` (contrôle) | (vide) |
| `systemctl list-unit-files` (mobile) | (vide) |

**Conclusion** : rien à nettoyer sur la VM. Les cleanups composer et mobile sont déjà complets côté prod.

---

## 3. Répertoire bizarre `apps/{home,composer,todo,viewer}/`

```
Chemin  : /Users/m3/Desktop/TMP/webmcp-auto-ui/apps/{home,composer,todo,viewer}/
Inode   : 131314979
Créé    : 2026-04-06 01:24:42
Modifié : 2026-04-06 11:00:46
Taille  : 64 bytes (répertoire vide)
Contenu : — (aucun fichier)
```

**Diagnostic** : artéfact d'une commande shell où `{home,composer,todo,viewer}` n'a pas été expansé (probablement sous `sh` au lieu de `bash`/`zsh`, ou entre guillemets). Le nom littéral `{home,composer,todo,viewer}` est devenu un répertoire.

**Proposition** : suppression pure (dir vide, 0 fichier).

Commande *proposée* (à exécuter APRÈS validation, PAS dans ce preflight) :
```bash
rmdir "/Users/m3/Desktop/TMP/webmcp-auto-ui/apps/{home,composer,todo,viewer}"
```

Risque : **nul** (dir vide, non référencé ailleurs).

---

## 4. `~/.claude/CLAUDE.md` global — diff proposé

Lignes concernées : **281-302** (section « Déploiement — Toujours utiliser le script deploy.sh »).

### État actuel (lignes 281-302)

```
281:- `scp` dans `composer/build/` au lieu de `composer/` a servi l'ancien code (3 incidents 2026-04-06)
282:- Les anciens chunks JS non nettoyés ont servi du contenu stale via le cache navigateur
283:
284:### Les chemins de deploy sont DIFFÉRENTS par app
285:
286:| App | ExecStart systemd | Deploy destination |
287:|-----|-------------------|--------------------|
288:| composer | `node index.js` | `/opt/webmcp-demos/composer/` (racine) |
289:| mobile | `node index.js` | `/opt/webmcp-demos/mobile/` (racine) |
290:| viewer | `node build/index.js` | `/opt/webmcp-demos/viewer/build/` |
291:| home, todo, showcase | static (nginx) | `/opt/webmcp-demos/{app}/` (racine) |
292:
293:### Comportement attendu
294:
295:```bash
296:# ✅ TOUJOURS utiliser le script
297:./scripts/deploy.sh              # tout
298:./scripts/deploy.sh composer     # une app
299:
300:# ❌ JAMAIS de deploy manuel
301:scp -r apps/composer/build/* bot:/opt/...   # INTERDIT
302:rsync -az apps/... bot:/opt/...              # INTERDIT
303:```
```

### Observation structurelle

Ce bloc **duplique** la même information que dans `CLAUDE.md` local du projet (lignes 11-18). Le CLAUDE.md local est la source de vérité et il est à jour (flex, boilerplate, viewer, home/todo/showcase, recipes — pas de composer, pas de mobile).

**Deux options** :

#### Option A — Mise à jour minimale (garder la section globale, synchroniser avec CLAUDE.md local)

Remplacer les lignes 281, 288, 289, 298, 301 comme suit :

```diff
-- `scp` dans `composer/build/` au lieu de `composer/` a servi l'ancien code (3 incidents 2026-04-06)
+- `scp` dans `<app>/build/` au lieu de `<app>/` a servi l'ancien code (3 incidents 2026-04-06)
```

```diff
 | App | ExecStart systemd | Deploy destination |
 |-----|-------------------|--------------------|
-| composer | `node index.js` | `/opt/webmcp-demos/composer/` (racine) |
-| mobile | `node index.js` | `/opt/webmcp-demos/mobile/` (racine) |
-| viewer | `node build/index.js` | `/opt/webmcp-demos/viewer/build/` |
-| home, todo, showcase | static (nginx) | `/opt/webmcp-demos/{app}/` (racine) |
+| flex | `node index.js` | `/opt/webmcp-demos/flex/` (racine) |
+| boilerplate | `node index.js` | `/opt/webmcp-demos/boilerplate/` (racine) |
+| viewer | `node index.js` | `/opt/webmcp-demos/viewer/` (racine) |
+| showcase, recipes | `node index.js` | `/opt/webmcp-demos/{app}/` (racine) |
+| home, todo | static (nginx) | `/opt/webmcp-demos/{app}/` (racine) |
```

Note : dans `deploy.sh` actuel `viewer` est `deploy_node_root` (racine, pas `build/`). Donc ligne 290 est aussi **obsolète**.

```diff
-./scripts/deploy.sh composer     # une app
+./scripts/deploy.sh flex         # une app
```

```diff
-scp -r apps/composer/build/* bot:/opt/...   # INTERDIT
+scp -r apps/flex/build/* bot:/opt/...        # INTERDIT
```

#### Option B — Dédupliquer (recommandé)

Supprimer tout le bloc 274-303 du CLAUDE.md global (de `## Déploiement — Toujours utiliser le script deploy.sh` jusqu'à la `---` finale incluse) et le remplacer par un pointeur court :

```
## Déploiement — Voir CLAUDE.md projet

Pour webmcp-auto-ui : voir `CLAUDE.md` du projet (règle absolue : toujours `./scripts/deploy.sh`, jamais `scp`/`rsync` direct).
```

Avantage : une seule source de vérité (CLAUDE.md local), plus de dérive entre global et local.

---

## 5. Plan d'action proposé (ordre + risque)

| # | Étape | Risque | Réversible ? |
|---|-------|--------|--------------|
| 1 | `rmdir apps/{home,composer,todo,viewer}` (dir vide littéral) | nul | oui (recréer) |
| 2 | Éditer `~/.claude/CLAUDE.md` global — Option A ou B | faible (fichier de règles, pas de code) | oui (git ? ce fichier n'est pas forcément versionné) |
| 3 | Commit : « chore: drop stale composer refs from preflight » | faible | oui (revert) |

**Pas de redéploiement nécessaire**. Pas de modif source. Pas de touch VM.

---

## 6. Risques et ambiguïtés

1. **`~/.claude/CLAUDE.md` est HORS du répertoire courant du projet** (`/Users/m3/.claude/CLAUDE.md`). Cette édition sort du scope « working directory » défini par la règle globale de l'utilisateur. **Autorisation explicite nécessaire** avant toute modification.
2. **`docs/contributing.md:202`** : `playwright test --grep "Composer"` — à vérifier si cette suite Playwright existe encore dans les tests actuels ou si c'est un vestige.
3. **`docs/theming.md`** et pages docs/starlight parlent de « the Composer » avec une majuscule, comme si c'était un produit distinct. À harmoniser peut-être (« flex » ou « le composer flex ») — mais c'est une question éditoriale, pas un nettoyage technique.
4. **`.docs-snapshot-light.txt`** est regénéré automatiquement (`npm run docs:sync`). Pas besoin d'y toucher à la main.
5. **Option A vs B** : choix utilisateur. B est plus propre (DRY), A est moins disruptif.

---

## Interdits respectés

- Aucun `rm`, `mv`, `git rm`, `git commit`, `git push`.
- Aucune modification de fichier source ou de config.
- SSH en lecture seule uniquement (`ls`, `systemctl status/list-unit-files`).
- Aucun `sudo`.
- Le fichier `~/.claude/CLAUDE.md` a été **lu** (exception documentée dans la règle globale) mais **non modifié**.

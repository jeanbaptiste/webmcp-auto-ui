# Mobile cleanup — Preflight audit (read-only)

Date: 2026-04-21
Auteur: agent preflight (aucune modification effectuée)

## Summary

**L'app "mobile" est déjà supprimée du monorepo et de la VM.** Seule une référence résiduelle subsiste dans un fichier snapshot de docs local (`.docs-snapshot-light.txt`), et deux commentaires `# DEPRECATED` dans un backup nginx non-actif. Aucune action destructive requise côté source ni systemd ni nginx actif.

## Code source à supprimer

Aucun. Le répertoire `apps/mobile/` n'existe pas. Contenu actuel de `apps/` :
```
boilerplate  flex  home  recipes  showcase  template  todo  viewer
```

## Code source à éditer

Aucune édition nécessaire.

- **`package.json` (racine)** : champ `workspaces` ne liste PAS `apps/mobile`. Scripts `dev` / `build` / `dev:*` ne mentionnent PAS mobile. Rien à modifier.
- **`scripts/deploy.sh`** : aucun hit sur `mobile` (case-insensitive). Rien à modifier.
- **`CLAUDE.md`** (projet) : aucun hit sur `mobile`. Rien à modifier.
- **`README.md`** : aucun hit.
- **`.github/workflows/`** : aucun hit sur `mobile`.

### Référence résiduelle — à décider

- **`.docs-snapshot-light.txt`** (racine, 223 KB, 13 avril) : contient du code ancien de `apps/recipes/+page.svelte` — références à `mobileTab`, `.mobile-tabs`, `.mobile-hidden` (lignes 2811–3524). Ce sont des **usages CSS responsive légitimes** (tabs <768px) — PAS des refs à l'ancienne app mobile. Le fichier semble être un snapshot de docs généré. **Non lié à l'app mobile supprimée**, pas d'action requise.

### Autres hits "mobile" — tous légitimes (responsive design / data labels)

| Fichier | Contexte | Verdict |
|---------|----------|---------|
| `apps/recipes/src/routes/+page.svelte` | CSS `.mobile-tabs`, `.mobile-hidden`, breakpoint < 768px | Légitime (responsive) |
| `apps/showcase/src/lib/demo-data.ts:252` | Label de chart `'Mobile'` dans une démo | Légitime (data) |
| `packages/ui/src/wm/FloatingLayout.svelte`, `FlexLayout.svelte` | `const mobile = $derived(cw < 640)` | Légitime (responsive layout) |
| `packages/servers/src/rough/recipes/*.md`, `canvas2d/recipes/line-chart.md` | Labels de séries (`'Mobile'`) dans exemples de charts | Légitime (data) |
| `packages/sdk/src/hyperskills.ts:7` | Commentaire "on mobile for large payloads" | Légitime (perf comment) |
| `docs/starlight/src/content/docs/apps/recipes.md` (fr+en) | Documentation du layout mobile de Recipes | Légitime (docs produit) |
| `docs/site/index.html (supprimé — voir commit fe51f94)` | CSS "mobile overlay" de la doc statique | Légitime (responsive) |
| `package-lock.json` | `ismobilejs` — dépendance transitive | Légitime (lockfile) |

## VM — à supprimer

**Aucun artefact à supprimer sur la VM.**

- `/opt/webmcp-demos/` : pas de dossier `mobile/` (contenu actuel : boilerplate, flex, home, multi-astro, multi-react, multi-vue, multi-webcomponents, recipes, showcase, test-nano-rag, todo, viewer)
- `/opt/webmcp-demos/.backups/` : pas de `mobile.prev` (18 backups listés, aucun pour mobile)
- `systemctl list-unit-files` : pas d'unit `mobile*`
- `systemctl status mobile.service` : `Unit mobile.service could not be found.`
- `/etc/systemd/system/` : pas d'entrée mobile
- Nginx actif (`/etc/nginx/sites-enabled/demos.hyperskills.net`) : aucun `location /mobile`

### Résidus nginx (backups, non-actifs)

- `/etc/nginx/sites-enabled/demos.hyperskills.net.bak-20260417-163744`
- `/etc/nginx/sites-available/demos.hyperskills.net.bak-20260417-163744`

Ces deux fichiers `.bak` contiennent aux lignes 76–77 :
```
# DEPRECATED:     # mobile — node
# DEPRECATED:     location /mobile {
```
Les lignes sont **déjà préfixées `# DEPRECATED:`** → elles sont commentées donc inactives. De plus, ce sont des fichiers `.bak` du 17 avril, remplacés par la config actuelle. **Impact nul.** Optionnel : supprimer les `.bak` si on veut nettoyer, mais ça concerne un nettoyage nginx général, pas la suppression "mobile".

## Risques

Aucun risque identifié. Toutes les refs "mobile" restantes dans le code sont des usages responsive design ou des labels de données de démo, **aucune ne pointe vers un binaire, un service ou un endpoint mobile**.

Un point de vigilance mineur : `.docs-snapshot-light.txt` (fichier de 223 KB, daté du 13 avril) semble être un ancien snapshot de regen docs. Pas lié à l'app mobile. Si gênant, à régénérer via `npm run docs:sync` (hors scope de ce preflight).

## Plan d'action proposé

**Le cleanup est déjà fait.** Rien à exécuter. Étapes possibles si l'utilisateur veut formaliser :

1. **(Optionnel)** Régénérer `.docs-snapshot-light.txt` via `npm run docs:sync` pour confirmer qu'aucune ref obsolète ne subsiste dans les snapshots générés — purement cosmétique.
2. **(Optionnel)** Sur la VM, supprimer les backups nginx `.bak-20260417-163744` (available + enabled) pour nettoyer les DEPRECATED résiduels — purement cosmétique, à faire dans une opération de ménage nginx séparée, jamais ici sans validation.
3. **Aucune autre action.** Pas de commit, pas de deploy, pas d'intervention systemd.

## Commandes utilisées (lecture seule)

```bash
ls apps/                              # confirme pas d'apps/mobile
grep -rin mobile --include="*.{ts,svelte,json,md,sh,yml,yaml,toml,mjs,js}"
ssh bot 'ls /opt/webmcp-demos/'
ssh bot 'ls /opt/webmcp-demos/.backups/'
ssh bot 'systemctl list-unit-files | grep -i mobile'
ssh bot 'systemctl status mobile.service'
ssh bot 'find /opt/webmcp-demos -iname "*mobile*"'
ssh bot 'grep -n -i mobile /etc/nginx/sites-enabled/*'
```

Aucune commande destructive (pas de `rm`, `systemctl stop/disable`, `git rm`, `mv`, ni `sudo`) n'a été exécutée.

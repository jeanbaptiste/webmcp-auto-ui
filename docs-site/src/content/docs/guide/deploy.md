---
title: Deploiement
description: Deployer les apps en production avec deploy.sh, systemd et nginx
sidebar:
  order: 4
---

## Deploy rapide

```bash
./scripts/deploy.sh                # deployer toutes les apps
./scripts/deploy.sh flex           # deployer une app
./scripts/deploy.sh home viewer    # deployer certaines apps
```

Le script gere tout : build des packages, build des apps, nettoyage des anciens fichiers sur le serveur, copie au bon endroit, verification sha256, restart services, confirmation.

**Toujours utiliser ce script. Jamais de deploy manuel avec scp ou rsync.**

## Architecture serveur

```
/opt/webmcp-demos/
  home/              # static -- nginx sert directement
  flex2/             # Node -- systemd : node index.js
  viewer2/build/     # Node -- systemd : node build/index.js
  showcase2/         # static -- nginx sert directement
  todo2/             # static -- nginx sert directement
  recipes/           # Node -- systemd : node index.js
```

### Les chemins de deploy different par app

| App | systemd ExecStart | Destination deploy | Type |
|-----|-------------------|--------------------|------|
| **Flex** | `node index.js` | `/opt/webmcp-demos/flex2/` (racine) | Node |
| **Viewer** | `node build/index.js` | `/opt/webmcp-demos/viewer2/build/` | Node |
| **Recipes** | `node index.js` | `/opt/webmcp-demos/recipes/` (racine) | Node |
| Home | static (nginx) | `/opt/webmcp-demos/home/` | Static |
| Showcase | static (nginx) | `/opt/webmcp-demos/showcase2/` | Static |
| Todo | static (nginx) | `/opt/webmcp-demos/todo2/` | Static |

**Si vous deployez au mauvais chemin, l'ancien code continue de tourner.**

## Variables d'environnement

| Variable | Apps | Localisation serveur |
|----------|------|--------------------|
| `ANTHROPIC_API_KEY` | flex2, viewer2, recipes | `/opt/webmcp-demos/{app}/.env` |
| `PUBLIC_BASE_URL` | home (build-time) | Variable shell avant `npm run build` |
| `PORT` | flex2(3004), viewer2(3002), recipes(3006) | systemd `Environment=PORT=...` |

## Verifier un deploy

```bash
# Toutes les pages retournent 200
for p in / /flex2/ /viewer2/ /showcase2/ /todo2/ /recipes/; do
  echo "$(curl -s -o /dev/null -w '%{http_code}' -L https://demos.hyperskills.net$p) $p"
done

# Services actifs
ssh bot "systemctl is-active webmcp-flex2 webmcp-viewer2 webmcp-recipes"
```

## Erreurs courantes

### Deploy au mauvais chemin

**Symptome** : Deploy + restart, mais l'ancienne version persiste.

**Cause** : Fichiers copies dans `flex/build/` mais le service execute `node index.js` depuis `flex/`.

**Fix** : Utiliser `./scripts/deploy.sh` qui connait le bon chemin pour chaque app.

### Anciens chunks non nettoyes

**Symptome** : Nouveau code deploye mais le navigateur montre un mix ancien/nouveau.

**Cause** : SvelteKit produit des fichiers haches. `scp` ajoute sans supprimer. Le navigateur charge les anciens chunks caches.

**Fix** : Le script `deploy.sh` supprime les anciens fichiers avant de copier.

### PUBLIC_BASE_URL oublie pour home

**Symptome** : Les liens de home pointent vers `localhost:5173`.

**Fix** : Le script `deploy.sh` applique automatiquement `PUBLIC_BASE_URL=https://demos.hyperskills.net`.

### .env manquant apres deploy

**Symptome** : Service crash "ANTHROPIC_API_KEY is not defined".

**Cause** : Le .env a ete supprime pendant le nettoyage.

**Fix** : Le script `deploy.sh` preserve les .env. Ne jamais utiliser `rsync --delete`.

## GitHub Pages (documentation)

La documentation (ce site) est deployee automatiquement sur GitHub Pages via une GitHub Action declenchee sur chaque push dans `docs-site/`.

```yaml
# .github/workflows/deploy-docs.yml
on:
  push:
    branches: [main]
    paths: ['docs-site/**']
```

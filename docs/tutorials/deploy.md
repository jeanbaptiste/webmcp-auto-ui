# Deployer en production

## Deploy rapide (recommande)

```bash
./scripts/deploy.sh                # deployer toutes les apps
./scripts/deploy.sh flex           # deployer une app
./scripts/deploy.sh home viewer    # deployer certaines apps
```

Le script gere tout : build des packages, **build des apps**, nettoyage des anciens fichiers sur le serveur, copie au bon endroit, **verification sha256**, restart services, confirmation.

**Toujours utiliser ce script. Jamais de deploy manuel avec scp.**

---

## Architecture serveur

```
/opt/webmcp-demos/
  home/              # static -- nginx sert directement
  flex/             # Node -- systemd : node index.js
  viewer/build/     # Node -- systemd : node build/index.js
  showcase/         # static -- nginx sert directement
  todo/             # static -- nginx sert directement
  recipes/           # Node -- systemd : node index.js
```

### CRITIQUE : Les chemins de deploy ne sont PAS les memes pour toutes les apps Node

| App | systemd ExecStart | Destination deploy | Pourquoi |
|-----|-------------------|--------------------|----------|
| **Flex** | `node index.js` | `/opt/webmcp-demos/flex/` (racine) | ExecStart sans prefix `build/` |
| **Viewer** | `node build/index.js` | `/opt/webmcp-demos/viewer/build/` | ExecStart inclut `build/` |
| **Recipes** | `node index.js` | `/opt/webmcp-demos/recipes/` (racine) | ExecStart sans prefix `build/` |
| Home | static (nginx) | `/opt/webmcp-demos/home/` | -- |
| Showcase | static (nginx) | `/opt/webmcp-demos/showcase/` | -- |
| Todo | static (nginx) | `/opt/webmcp-demos/todo/` | -- |

**Si vous deployez au mauvais chemin, l'ancien code continue de tourner.**

---

## Deploy manuel (si absolument necessaire)

### Apps statiques (home)

```bash
# Builder avec l'URL de production (REQUIS pour home)
PUBLIC_BASE_URL=https://demos.hyperskills.net npm -w apps/home run build

# Nettoyer et copier
ssh bot "rm -rf /opt/webmcp-demos/home/_app"
scp -r apps/home/build/* bot:/opt/webmcp-demos/home/
```

### Apps Node -- Flex (deploy racine)

```bash
npm -w apps/flex run build

# OBLIGATOIRE : nettoyer les anciens fichiers d'abord
ssh bot "cd /opt/webmcp-demos/flex && rm -f index.js handler.js env.js shims.js && rm -rf client server"
scp -r apps/flex/build/* bot:/opt/webmcp-demos/flex/
ssh bot "systemctl restart webmcp-flex"
```

### Apps Node -- Viewer (deploy build/)

```bash
npm -w apps/viewer run build

ssh bot "rm -rf /opt/webmcp-demos/viewer/build"
ssh bot "mkdir -p /opt/webmcp-demos/viewer/build"
scp -r apps/viewer/build/* bot:/opt/webmcp-demos/viewer/build/
ssh bot "systemctl restart webmcp-viewer"
```

---

## Erreurs courantes

### 1. Deploy au mauvais chemin

**Symptome** : Deploy + restart, mais l'ancienne version persiste.

**Cause** : Fichiers copies dans `flex/build/` mais le service execute `node index.js` depuis `flex/`.

**Fix** : `./scripts/deploy.sh` ou verifier le ExecStart du service systemd.

### 2. Anciens chunks non nettoyes

**Symptome** : Nouveau code deploye mais le navigateur montre un mix ancien/nouveau.

**Cause** : SvelteKit produit des fichiers hasches. `scp` ajoute sans supprimer. Le navigateur charge les anciens chunks caches.

**Fix** : Toujours supprimer les anciens fichiers avant de copier :
```bash
ssh bot "rm -rf /opt/webmcp-demos/flex/{client,server,index.js,handler.js}"
```

### 3. PUBLIC_BASE_URL oublie pour home

**Symptome** : Les liens de home pointent vers `localhost:5173`.

**Fix** : Builder avec `PUBLIC_BASE_URL=https://demos.hyperskills.net`.

### 4. .env manquant apres deploy

**Symptome** : Service crash "ANTHROPIC_API_KEY is not defined".

**Cause** : Le .env a ete supprime pendant le nettoyage.

**Fix** : Le script deploy preserve les .env. En manual, ne pas `rm -rf *`.

### 5. rsync au lieu de scp

**Jamais rsync.** `rsync --delete` a deja supprime les `.env` de production.

### 6. Deploy sans rebuild de l'app

**Symptome** : Bug fixe dans le code, deploye, bug toujours la.

**Cause** : L'ancien deploy.sh rebuildait les packages mais pas les apps. Tout changement dans `apps/*/src/` etait ignore.

**Fix applique** : `deploy.sh` rebuild chaque app avant de copier. La verification sha256 confirme.

---

## Verifier un deploy

```bash
# Toutes les pages retournent 200
for p in / /flex/ /viewer/ /showcase/ /todo/ /recipes/; do
  echo "$(curl -s -o /dev/null -w '%{http_code}' -L https://demos.hyperskills.net$p) $p"
done

# L'API chat fonctionne (apps Node)
curl -s https://demos.hyperskills.net/flex/api/chat \
  -X POST -H 'Content-Type: application/json' \
  -d '{"messages":[{"role":"user","content":"hi"}],"model":"claude-haiku-4-5-20251001","max_tokens":5}' \
  | head -c 50

# Services actifs
ssh bot "systemctl is-active webmcp-flex webmcp-viewer webmcp-recipes"
```

---

## Environnement

| Variable | Apps | Localisation serveur |
|----------|------|--------------------|
| `ANTHROPIC_API_KEY` | flex, viewer, recipes | `/opt/webmcp-demos/{app}/.env` |
| `PUBLIC_BASE_URL` | home (build-time) | Variable shell avant `npm run build` |
| `PORT` | flex(3004), viewer(3002), recipes(3006) | systemd `Environment=PORT=...` |

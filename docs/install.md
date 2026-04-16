# Guide d'installation

WebMCP Auto-UI en local en moins de 5 minutes.

## Prerequis

- **Node.js 22+** (`node -v`)
- **npm 10+** (`npm -v`)
- Une **cle API LLM** (pour les features LLM distantes, e.g. Anthropic, Google, OpenAI, Mistral)

## Cloner et installer

```bash
git clone https://github.com/jeanbaptiste/webmcp-auto-ui.git
cd webmcp-auto-ui
npm install
```

`npm install` resout tous les workspaces automatiquement (packages + apps).

## Structure du projet

```
webmcp-auto-ui/
  packages/
    core/       @webmcp-auto-ui/core   -- W3C WebMCP polyfill + MCP client
    sdk/        @webmcp-auto-ui/sdk    -- HyperSkill format, skills registry, canvas store
    agent/      @webmcp-auto-ui/agent  -- Agent loop + 4 providers + ToolLayers + recettes
    ui/         @webmcp-auto-ui/ui     -- 34+ Svelte 5 components + agent UI widgets
  apps/
    home/       Landing page + app launcher
    flex/      Flex -- canvas IA, ToolLayers, component(), LogDrawer, RecipeModal
    viewer/    Viewer -- lecteur HyperSkills read-only avec CRUD, DAG, paste URI
    showcase/  Showcase -- demo dynamique avec agent + MCP + 3 themes
    todo/      Todo -- todo WebMCP, template minimal
    recipes/    Recipes -- explorateur de recettes, layout 3 colonnes, chat input, test live
```

## Builder les packages

Les packages doivent etre buildes dans l'ordre de dependance :

```bash
# 1. core (pas de deps)
npm -w packages/core run build

# 2. sdk (pas de deps package, partage des types)
npm -w packages/sdk run build

# 3. agent (depend de core)
npm -w packages/agent run build

# 4. ui (standalone, builder en dernier par securite)
npm -w packages/ui run build
```

## Lancer les serveurs dev

Toutes les apps en parallele :

```bash
npm run dev
```

Ou une app specifique :

```bash
npm run dev:home
npm -w apps/flex run dev
npm -w apps/viewer run dev
npm -w apps/todo run dev
npm -w apps/showcase run dev
npm -w apps/recipes run dev
```

## Ports

| App       | Port | URL                    |
|-----------|------|------------------------|
| home      | 5173 | http://localhost:5173   |

Les autres apps (flex, viewer, todo, showcase, recipes) sont assignees a des ports par Vite au lancement.

## Variables d'environnement

| Variable           | Apps                    | Role                                          |
|--------------------|-------------------------|-----------------------------------------------|
| `ANTHROPIC_API_KEY`| flex, todo              | Proxy server-side pour l'API LLM distante (compatible OpenAI) |
| `PUBLIC_BASE_URL`  | home                    | Base URL pour les liens (default: localhost)   |

```bash
export ANTHROPIC_API_KEY="sk-ant-..."
```

## Problemes courants

**`Cannot find module '@webmcp-auto-ui/core'`**
Builder core d'abord : `npm -w packages/core run build`

**Port deja utilise**
`lsof -ti:5173 | xargs kill` ou changer le port dans `vite.config.ts`.

**`ERR_MODULE_NOT_FOUND` sur les imports agent**
Le package agent depend de core via `file:../core`. Builder core avant.

**Svelte check errors dans le package UI**
`npm -w packages/ui run check` pour les diagnostics. Les peer deps (`svelte`, `d3`, `leaflet`) doivent etre installees a la racine.

## Deployer en production

Utiliser le script deploy -- il gere l'ordre de build, les chemins corrects, et le nettoyage :

```bash
./scripts/deploy.sh              # deployer toutes les apps
./scripts/deploy.sh flex         # deployer une app
```

Voir le [tutoriel deploy](tutorials/deploy.md) pour les details.

**Ne JAMAIS deployer manuellement avec scp** -- les chemins de deploy different par app (flex = racine, viewer = `build/`).

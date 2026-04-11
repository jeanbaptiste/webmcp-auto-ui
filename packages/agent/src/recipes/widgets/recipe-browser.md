---
widget: recipe-browser
description: Affiche les recettes disponibles sous forme de cartes interactives et permet de consulter le detail de chaque recette
group: rich
schema:
  type: object
  properties:
    title:
      type: string
    cards:
      type: array
      items:
        type: object
        required:
          - title
        properties:
          title:
            type: string
          description:
            type: string
          tags:
            type: array
            items:
              type: string
          meta:
            type: object
            properties:
              recipe_name:
                type: string
              server:
                type: string
    interactive:
      type: boolean
  required:
    - cards
---

## Quand utiliser
Quand l'utilisateur veut voir les recettes disponibles, explorer les possibilites du serveur, ou comprendre comment utiliser un widget specifique.

## Comment

### Etape 1 — Lister les recettes
Appelle `search_recipes()` sur chaque serveur connecte (MCP et WebMCP) pour obtenir la liste des recettes.

### Etape 2 — Afficher en cartes interactives
Utilise `widget_display('cards', ...)` avec le parametre `interactive: true` pour rendre les cartes cliquables :

```json
{
  "name": "cards",
  "params": {
    "title": "Recettes disponibles",
    "cards": [
      {
        "title": "Nom de la recette",
        "description": "Description courte",
        "tags": ["serveur_source"],
        "meta": { "recipe_name": "nom_technique", "server": "nom_serveur" }
      }
    ],
    "interactive": true
  }
}
```

Le champ `meta` est important : il sera renvoye dans l'evenement d'interaction quand l'utilisateur clique sur la carte.

### Etape 3 — Reagir au clic
Quand l'utilisateur clique sur une carte, tu recevras un message d'interaction contenant les donnees de `meta`. Utilise `meta.recipe_name` et `meta.server` pour :

1. Appeler `get_recipe(meta.recipe_name)` sur le bon serveur
2. Afficher le contenu de la recette dans un widget `code` avec `language: 'markdown'` :

```json
{
  "name": "code",
  "params": {
    "title": "Recette : Nom",
    "language": "markdown",
    "code": "contenu complet de la recette..."
  }
}
```

3. **Lier les deux widgets** : le widget cartes (liste) et le widget code (detail) sont lies. Quand l'utilisateur clique sur une autre carte, met a jour le widget detail au lieu d'en creer un nouveau via `canvas('update', ...)`.

## Erreurs courantes
- Ne pas oublier `interactive: true` dans les cartes — sans ca, les clics ne remontent pas
- Ne pas creer un nouveau widget detail a chaque clic — reutiliser l'existant via `canvas('update', ...)`
- Les recettes MCP et WebMCP ont des noms de serveur differents — utiliser le bon prefixe pour `get_recipe()`

## Exemple complet

Utilisateur : "Montre-moi les recettes disponibles"

1. `autoui_webmcp_search_recipes()` → 26 recettes widgets
2. `tricoteuses_mcp_search_recipes()` → 10 recettes donnees
3. `widget_display('cards', { title: "36 recettes", cards: [...], interactive: true })`
4. *L'utilisateur clique sur "Hemicycle"*
5. `autoui_webmcp_get_recipe('hemicycle')` → contenu markdown
6. `widget_display('code', { title: "Recette : Hemicycle", language: "markdown", code: "..." })`

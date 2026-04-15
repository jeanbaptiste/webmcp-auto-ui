---
widget: recipe-browser
description: Displays available recipes as interactive cards and allows viewing the detail of each recipe
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

## When to use
When the user wants to see available recipes, explore what the server can do, or understand how to use a specific widget.

## How to use

### Step 1 — List recipes
Call `search_recipes()` on each connected server (MCP and WebMCP) to get the list of recipes.

### Step 2 — Display as interactive cards
Use `widget_display('cards', ...)` with the `interactive: true` parameter to make cards clickable:

```json
{
  "name": "cards",
  "params": {
    "title": "Available recipes",
    "cards": [
      {
        "title": "Recipe name",
        "description": "Short description",
        "tags": ["source_server"],
        "meta": { "recipe_name": "technical_name", "server": "server_name" }
      }
    ],
    "interactive": true
  }
}
```

The `meta` field is important: it will be returned in the interaction event when the user clicks on a card.

### Step 3 — React to a click
When the user clicks on a card, you will receive an interaction message containing the `meta` data. Use `meta.recipe_name` and `meta.server` to:

1. Call `get_recipe(meta.recipe_name)` on the right server
2. Display the recipe content in a `code` widget with `language: 'markdown'`:

```json
{
  "name": "code",
  "params": {
    "title": "Recipe: Name",
    "language": "markdown",
    "code": "full recipe content..."
  }
}
```

3. **Link the two widgets**: the cards widget (list) and the code widget (detail) are linked. When the user clicks on another card, update the detail widget instead of creating a new one via `canvas('update', ...)`.

## Common mistakes
- Do not forget `interactive: true` in the cards — without it, clicks are not forwarded
- Do not create a new detail widget on each click — reuse the existing one via `canvas('update', ...)`
- MCP and WebMCP recipes have different server names — use the correct prefix for `get_recipe()`

## Full example

User: "Show me the available recipes"

1. `autoui_webmcp_search_recipes()` → 26 widget recipes
2. `tricoteuses_mcp_search_recipes()` → 10 data recipes
3. `widget_display('cards', { title: "36 recipes", cards: [...], interactive: true })`
4. *User clicks on "Assembly composition"*
5. `autoui_webmcp_get_recipe('hemicycle')` → markdown content
6. `widget_display('code', { title: "Recipe: Assembly composition", language: "markdown", code: "..." })`

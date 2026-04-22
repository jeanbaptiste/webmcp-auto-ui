---
widget: notebook-workspace
description: Dense analyst workspace with a header bar (title, draft/published tag, run all, publish) and a left sidebar listing data sources and cells for navigation. Cells display their name, execution time, and row counts. Targets data-team workflows with a publishable deliverable.
schema:
  type: object
  properties:
    id:
      type: string
    title:
      type: string
    mode:
      type: string
      enum: [edit, view]
    cells:
      type: array
      items:
        type: object
        required: [type, content]
        properties:
          type:
            type: string
            enum: [md, sql, js]
          content:
            type: string
          name:
            type: string
            description: Cell name shown in sidebar navigation (e.g. "intro", "sql_sales", "plot")
          hideSource:
            type: boolean
          hideResult:
            type: boolean
---

## When to use

Use `notebook-workspace` for analyst-oriented work that needs:
- Multi-cell analyses with named, navigable cells (sidebar)
- A clear separation between the editing context and a publishable "app" view
- A data source reference permanently visible (even as placeholder: "no source connected")
- Team workflows where "run all" and "publish" are distinct actions

This layout is more enterprise-flavoured than `notebook-compact`. Prefer it when the user is building something to hand off, not just exploring.

## How to use

1. **Create with named cells** so the sidebar navigation is meaningful:
   ```
   widget_display({name: "notebook-workspace", params: {
     title: "My analysis",
     cells: [
       {type: "md", name: "intro", content: "What we are investigating."},
       {type: "sql", name: "fetch_rows", content: "select * from source limit 100"},
       {type: "js", name: "visualize", content: "// chart the rows"}
     ]
   }})
   ```

2. **The sidebar shows** data sources (when connected) and the numbered list of cells. Clicking a cell item scrolls to it and focuses its textarea for immediate editing.

3. **The header has** `run all` / `share` / `publish` buttons.
   - **`run all`** sequentially executes every non-markdown cell from top to bottom.
   - **`publish`** is the primary (accent-coloured) CTA — it flips the notebook to `mode: 'view'`, tags it `published` (from `draft`), and emits a Hyperskill share link automatically.
   - The **title** is editable inline in the header and persists across reloads via localStorage.

## Notes

- Cells are added via buttons in the sidebar (not in the header).
- Run controls (green/red pill) sit at the left of each cell's header, right after the drag handle.
- Each cell head can be renamed inline in the sidebar (click the "N · name" item).
- The sidebar under "sources" shows a placeholder when no MCP source is connected. Each source row is clickable: a `connect via mcp…` entry opens the servers modal so the user can hook one up without leaving the notebook.
- **SQL cells** dispatch to the connected MCP server's `*_query_sql` tool (auto-detected).
- **JS cells** execute in an isolated Web Worker with upstream named outputs injected as scope.

## Left pane — resources from connected servers

A collapsible **left pane** (bookmark-bar styling, collapsed by default) lists recipes and tools exposed by connected MCP data servers. Clicking any recipe opens a viewer modal; each fenced code block inside exposes a `↳ inject` button that drops the snippet into the notebook as a new cell.

Two toolbar buttons flank this pane:

- **`+ md`** — 3-tab modal (New / File / URL) to create a markdown cell from scratch, from a local `.md` file, or from a URL.
- **`+ recipe`** — 3-tab modal (Browser / File / URL) to import a recipe from a connected server, a local `.recipe.md` file, or a URL.

## Share & publish

The `share` button offers **four formats**:

- **Hyperskill link** — copies both the canonical Hyperskill URL and a short domain-scoped URL (`?n=<token>`). The published view is served read-only at `nb.hyperskills.net`.
- **Markdown** — downloads a `.md` file with the notebook content.
- **PNG** — snapshots the rendered notebook.
- **JSON** — exports full widget state.

`publish` wraps these: it sets `mode: 'view'`, tags the notebook `published`, and copies the Hyperskill link in one gesture — the canonical way to hand off a finished analysis.

## Integration with connected data servers

If a MCP **data** server is currently connected (the user has linked one, e.g. `tricoteuses`, `metmuseum`), BEFORE seeding cells the agent MUST:

1. Call `{server}_list_recipes()` or `{server}_search_recipes(query)` to discover data recipes relevant to the user's intent.
2. Call `{server}_list_tools()` to see available tables and endpoints.
3. For each high-signal recipe or table, seed ONE named cell that demonstrates it — typical shapes:
   - an SQL `SELECT ... LIMIT 10` with a meaningful cell name (e.g. `fetch_amendments`)
   - a `run_script` invocation for recipes requiring code
   - a short markdown cell describing the recipe and its parameters
4. Pass the server metadata via the `servers:` param so the sidebar "sources" section, the left pane, and the server menu modal render correctly:

   ```ts
   widget_display({
     name: 'notebook-workspace',
     params: {
       title: '...',
       cells: [...],
       servers: [{ name: 'tricoteuses', url: 'https://...', kind: 'data' }]
     }
   })
   ```

If NO data server is connected, seed generic markdown-only cells that describe the intended analysis and invite the user to connect an MCP server — this matches the "no source connected" sidebar placeholder.

**Filter rule**: only MCP *data* servers (`kind: 'data'`) belong in `servers:`. Do NOT include WebMCP UI servers such as `autoui` — they expose no queryable data and would clutter the sources sidebar.

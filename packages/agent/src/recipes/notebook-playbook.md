---
id: create-interactive-notebook-playbook
name: Create an interactive notebook playbook
components_used: [notebook]
when: the user wants to experiment with data, prototype a small analysis, share a reusable scenario, or prepare a hackathon-ready playground. Keywords include "playground", "playbook", "experiment", "try", "prototype", "hackathon", "share a notebook", "template", "starter", "publish", "memo", "report".
servers: [autoui]
layout:
  type: single
---

## When to use

The user asks for a **notebook-like interactive playground** that combines text, queries, and code cells. Typical triggers:
- "Give me a playground for exploring X"
- "Prepare a notebook I can share with my team"
- "I want to prototype a small analysis"
- "Set up a hackathon starter"
- "Make a reusable template for exploring CSVs / this API / these tables"
- "Publish this analysis as a short memo"

This recipe applies across domains (parliamentary data, biodiversity, news, business datasets, etc.) — it only prescribes the **shape** of the answer, not its content.

## How to use

### Step 1 — Use the `notebook` widget

There is a single notebook widget. Prose paragraphs (`md`), SQL queries (`sql`) and JS code (`js`) share one ordered flow, all drag-and-droppable together. Publication-ready serif prose, suitable for playgrounds, memos, collaborative reviews and analyst workspaces alike.

### Step 2 — Pre-fill the cells with context-aware seeds

Never create an empty notebook. Always seed with 3–5 cells that give the user an immediate starting point:

1. **First cell: markdown** — title + one-sentence context of what the notebook is for
2. **Second cell: sql or md** — if an MCP data source is connected, a starter query that returns something visible (e.g. `SELECT * FROM {table} LIMIT 10`). Otherwise a markdown cell describing the next step
3. **Third cell: code** — a transformation or a visualization that uses the output of step 2. Use `varname` on the SQL cell (`varname: "rows"`) and reference it in the JS cell to activate the reactive dataflow
4. **Last cell: markdown** — a short "to you to play" note inviting the user to add cells or edit

Example seed for a generic data playground:

```
widget_display({name: "notebook", params: {
  title: "Exploration playground",
  cells: [
    {type: "md", content: "### Exploration playground\n\nStart by running the first SQL cell, then iterate."},
    {type: "sql", content: "select * from source limit 10", varname: "rows"},
    {type: "js", content: "// explore rows here\nconsole.table(rows)"},
    {type: "md", content: "### Your turn\n\nAdd cells with `+ sql` or `+ js`, reorder via the drag handle, and share via the header button."}
  ]
}})
```

### Step 3 — Adapt seeds to the connected MCP server

If a specific MCP server is connected, replace the generic `source` and `select *` placeholders with actual tables and queries from that server:
- For a parliamentary server (Tricoteuses): use actual tables like `acteurs`, `scrutins`, `amendements` with meaningful LIMIT
- For a biodiversity server (iNaturalist): use the server's typical queries to return observations
- For a generic SQL server: list tables first (`list_tables` or `describe_table`), then seed with a `SELECT * FROM {first_table} LIMIT 10`

Always keep queries **short** and **limited** so the first run returns quickly and visually.

SQL cells are dispatched automatically to the server's `*_query_sql` tool (first match). JS cells run in a Web Worker with upstream named outputs injected as scope.

### Step 4 — Exporting & publishing

The toolbar `share` button offers **four export formats**:

| Format | What it does |
|---|---|
| **Hyperskill link** | Copies both the canonical Hyperskill URL and a short domain-scoped URL (`?n=<token>`). The short URL opens the read-only public viewer at `nb.hyperskills.net`. |
| **Markdown** | Downloads a `.md` file containing the notebook content. |
| **PNG** | Snapshots the rendered notebook to an image. |
| **JSON** | Exports the full widget state — re-importable for programmatic reuse. |

### Step 5 — Working with connected data servers

When one or more MCP data servers are connected, the notebook exposes a **collapsible left pane** (bookmark-bar styling, collapsed by default) that lists:
- **Recipes** published by each server (`{server}_list_recipes()`)
- **Tools / tables** exposed by each server (`{server}_list_tools()`)

Clicking any recipe opens a viewer modal. Each fenced code block inside the recipe has a `↳ inject` button that drops the snippet into the notebook as a new cell.

Two toolbar buttons flank the left pane:
- **`+ md`** — 3-tab modal (New / File / URL) to create a markdown cell from scratch, from a local `.md` file, or from a URL
- **`+ recipe`** — 3-tab modal (Browser / File / URL) to import a recipe from a connected server, a local `.recipe.md` file, or a URL

Pass the server metadata via the `servers:` param:

```ts
widget_display({
  name: 'notebook',
  params: {
    title: '...',
    cells: [...],
    servers: [{ name: 'tricoteuses', url: 'https://...', kind: 'data' }]
  }
})
```

**Filter rule**: only MCP *data* servers (`kind: 'data'`) belong in `servers:`. Do NOT include WebMCP UI servers such as `autoui`.

### Step 6 — Hand-off guidance

After creating the notebook, mention to the user that they can:
- **Share in four formats** via the toolbar `share` button (Hyperskill / Markdown / PNG / JSON)
- **Switch to `view` mode** (read-only) when presenting
- Access the `⟲ history` panel to see the edit trace and restore deleted cells
- **Import recipes** from connected MCP servers via the left pane or the `+ recipe` modal

## Examples

### Generic CSV / table playground
```
widget_display({name: "notebook", params: {
  title: "CSV playground",
  cells: [
    {type: "md", content: "### CSV playground\n\nRun the SQL cell to see the first rows, then iterate."},
    {type: "sql", content: "select * from source limit 20", varname: "rows"},
    {type: "js", content: "// summarize, chart, or filter rows here\nconsole.table(rows)"}
  ]
}})
```

### Final memo
```
widget_display({name: "notebook", params: {
  title: "Findings memo",
  kicker: "memo",
  cells: [
    {type: "md", content: "Three observations from last week's data."},
    {type: "md", content: "First, the volume is up. Here is the query:"},
    {type: "sql", content: "select count(*) from source"},
    {type: "md", content: "Second, the distribution has shifted."},
    {type: "js", content: "// chart distribution"},
    {type: "md", content: "We conclude that..."}
  ]
}})
```

## Common mistakes

- **Empty notebook**: never call `widget_display` without at least 3 seed cells. The user expects something they can immediately run.
- **Heavy initial queries**: always `LIMIT 10` or `LIMIT 20` in seed SQL cells. Users will expand later if needed.
- **Missing `varname` on SQL cells**: the named output drives the reactive dataflow (downstream JS cells go stale when their upstream re-runs). Without it, the notebook loses half its story.
- **Inventing UUIDs**: leave `id` unset — the widget generates a sensible default. Only pass `id` when restoring an existing notebook.
- **Including `autoui` in `servers:`**: only MCP *data* servers (`kind: 'data'`) belong there.

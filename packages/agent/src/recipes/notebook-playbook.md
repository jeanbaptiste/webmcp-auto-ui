---
id: create-interactive-notebook-playbook
name: Create an interactive notebook playbook
components_used: [notebook-compact, notebook-workspace, notebook-document, notebook-editorial]
when: the user wants to experiment with data, prototype a small analysis, share a reusable scenario, let others fork and try a dataset, or prepare a hackathon-ready playground. Keywords include "playground", "playbook", "experiment", "try", "prototype", "hackathon", "share a notebook", "template", "starter", "publish", "fork", "memo".
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
- "Let me fork that notebook"

This recipe applies across domains (parliamentary data, biodiversity, news, business datasets, etc.) — it only prescribes the **shape** of the answer, not its content.

## How to use

### Step 1 — Pick the right notebook layout

Choose one of the four `notebook-*` widgets based on the user's implicit intent:

| Layout | Use when |
|---|---|
| `notebook-compact` | Quick data exploration, reactive dataflow with named outputs, minimal chrome. **Default for most "playground" and "hackathon" requests.** |
| `notebook-workspace` | The user expects a multi-cell analyst workspace with sources, cell navigation, `run all`, and a `publish` step. Use when they mention "dashboard", "app", "workspace", "publish". |
| `notebook-document` | The user plans to share and discuss with a team. Use when "collaborate", "review", "comment", "reply" appear. |
| `notebook-editorial` | The user wants a polished, article-like final deliverable mixing prose and code. Use for "memo", "report", "writeup", "blog-style". |

When in doubt, pick `notebook-compact`.

### Step 2 — Pre-fill the cells with context-aware seeds

Never create an empty notebook. Always seed with 3–5 cells that give the user an immediate starting point:

1. **First cell: markdown** — title + one-sentence context of what the notebook is for
2. **Second cell: markdown or code** — if an MCP data source is connected, a starter query that returns something visible (e.g. `SELECT * FROM {table} LIMIT 10`). Otherwise a markdown cell describing the next step
3. **Third cell: code** — a transformation or a visualization that uses the output of step 2. Use `varname` on the SQL cell (`varname: "rows"`) and reference it in the JS cell — this activates the **reactive dataflow** (the downstream JS cell is flagged stale automatically when its upstream re-runs)
4. **Last cell: markdown** — a short "to you to play" note inviting the user to add cells or edit

Example seed for a generic data playground:

```
widget_display({name: "notebook-compact", params: {
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

All four notebook layouts share the same `share` button in the toolbar, offering **four export formats**:

| Format | What it does |
|---|---|
| **Hyperskill link** | Copies both the canonical Hyperskill URL and a short domain-scoped URL (`?n=<token>`). The short URL opens the read-only public viewer at `nb.hyperskills.net`. |
| **Markdown** | Downloads a `.md` file containing the notebook content. |
| **PNG** | Snapshots the rendered notebook to an image. |
| **JSON** | Exports the full widget state — re-importable for programmatic reuse. |

**Layout-specific share affordances:**
- `notebook-workspace` has a dedicated `publish` button (primary, accent-coloured) that flips `mode: 'view'`, tags the notebook `published` (from `draft`), and copies the Hyperskill link in one gesture. Use this when the user wants a clean hand-off.
- `notebook-editorial` shows a `forkId` identifier in the footer next to `share` — it is purely cosmetic (no fork/clone semantics implemented).
- `notebook-document` shows a single `share` link (live invite/collaboration is not available in this build; presence avatars only render when the `presence` param is explicitly provided).

### Step 5 — Working with connected data servers

When one or more MCP data servers are connected, every notebook layout exposes a **collapsible left pane** (bookmark-bar styling, collapsed by default) that lists:
- **Recipes** published by each server (`{server}_list_recipes()`)
- **Tools / tables** exposed by each server (`{server}_list_tools()`)

Clicking any recipe opens a viewer modal. Each fenced code block inside the recipe has a `↳ inject` button that drops the snippet into the notebook as a new cell — the user never has to copy-paste.

Two toolbar buttons flank the left pane on every layout:
- **`+ md`** — 3-tab modal (New / File / URL) to create a markdown cell from scratch, from a local `.md` file, or from a URL
- **`+ recipe`** — 3-tab modal (Browser / File / URL) to import a recipe from a connected server, a local `.recipe.md` file, or a URL

Pass the server metadata via the `servers:` param so these affordances populate correctly:

```ts
widget_display({
  name: 'notebook-compact',
  params: {
    title: '...',
    cells: [...],
    servers: [{ name: 'tricoteuses', url: 'https://...', kind: 'data' }]
  }
})
```

**Filter rule**: only MCP *data* servers (`kind: 'data'`) belong in `servers:`. Do NOT include WebMCP UI servers such as `autoui` — they expose no queryable data.

### Step 6 — Hand-off guidance

After creating the notebook, mention to the user that they can:
- **Share in four formats** via the toolbar `share` button (Hyperskill / Markdown / PNG / JSON)
- **Switch to `view` mode** (read-only) when presenting
- Use **`run all`** (workspace) or **`publish`** (workspace) for one-shot execution and publication
- **Reply** to margin comments in a document layout (`+ reply` under each comment)
- Access the `⟲ history` panel to see the edit trace and restore deleted cells
- **Import recipes** from connected MCP servers via the left pane or the `+ recipe` modal

For hackathon contexts, prefer seeding a `notebook-document` layout so participants can leave margin comments and replies on cells (presence stays opt-in — pass a `presence` array only if you have real editors to show).

## Examples

### Generic CSV / table playground
```
// user: "I need a playground to play with this CSV"
widget_display({name: "notebook-compact", params: {
  title: "CSV playground",
  cells: [
    {type: "md", content: "### CSV playground\n\nRun the SQL cell to see the first rows, then iterate."},
    {type: "sql", content: "select * from source limit 20", varname: "rows"},
    {type: "js", content: "// summarize, chart, or filter rows here\nconsole.table(rows)"}
  ]
}})
```

### Publishable analyst workspace
```
// user: "Set up an analysis I can publish to the team as an app"
widget_display({name: "notebook-workspace", params: {
  title: "Sales review",
  cells: [
    {type: "md", name: "intro", content: "What this analysis covers."},
    {type: "sql", name: "fetch_sales", content: "select * from sales limit 100"},
    {type: "js", name: "plot", content: "// chart the rows"}
  ]
}})
// Then tell the user: click `run all` to execute, then `publish` to flip to view mode and copy the Hyperskill link.
```

### Collaborative analysis with comments
```
// user: "Set up a notebook my team can edit and comment on"
widget_display({name: "notebook-document", params: {
  title: "Team analysis",
  cells: [
    {type: "md", content: "Kick-off: describe the question here."},
    {type: "sql", content: "select * from source limit 10", comment: {who: "reviewer", when: "2m", body: "Should we filter to last quarter only?"}},
    {type: "md", content: "Your findings: add thoughts, <mark>highlights</mark>, and reply to the comment on the query above."}
  ]
}})
```

### Final memo
```
// user: "Prepare a short memo of my findings"
widget_display({name: "notebook-editorial", params: {
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
- **Wrong layout for the intent**: do not use `notebook-editorial` for quick exploration — it signals "finished article" and intimidates. Use `notebook-compact` unless the user explicitly asks for a publication feel.
- **Heavy initial queries**: always `LIMIT 10` or `LIMIT 20` in seed SQL cells. Users will expand later if needed.
- **Missing `varname` on SQL cells** (in compact layout): the named output is what the compact layout showcases, and it drives the stale-flag dataflow. Without it, the notebook loses half its reactive story.
- **Inventing UUIDs**: leave `id` and `forkId` unset — the widget generates sensible defaults. Only pass `id` when restoring an existing notebook.
- **Faking presence**: do not pass a `presence` array to `notebook-document` unless there are real editors to show. Presence is opt-in by design — empty `presence` hides the avatar row entirely.
- **Including `autoui` in `servers:`**: only MCP *data* servers (`kind: 'data'`) belong there. UI servers like `autoui` would pollute the left pane.

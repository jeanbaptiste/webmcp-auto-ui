---
id: create-interactive-notebook-playbook
name: Create an interactive notebook playbook
components_used: [notebook-compact, notebook-workspace, notebook-document, notebook-editorial]
when: the user wants to experiment with data, prototype a small analysis, share a reusable scenario, let others fork and try a dataset, or prepare a hackathon-ready playground. Keywords include "playground", "playbook", "experiment", "try", "prototype", "hackathon", "share a notebook", "template", "starter".
servers: []
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

This recipe applies across domains (parliamentary data, biodiversity, news, business datasets, etc.) — it only prescribes the **shape** of the answer, not its content.

## How to use

### Step 1 — Pick the right notebook layout

Choose one of the four `notebook-*` widgets based on the user's implicit intent:

| Layout | Use when |
|---|---|
| `notebook-compact` | Quick data exploration, reactive dataflow with named outputs, minimal chrome. **Default for most "playground" and "hackathon" requests.** |
| `notebook-workspace` | The user expects a multi-cell analyst workspace with sources, cell navigation, and a "publish" step. Use when they mention "dashboard", "app", "workspace". |
| `notebook-document` | The user plans to share and discuss with a team. Use when "collaborate", "review", "comment" appear. |
| `notebook-editorial` | The user wants a polished, article-like final deliverable mixing prose and code. Use for "memo", "report", "writeup", "blog-style". |

When in doubt, pick `notebook-compact`.

### Step 2 — Pre-fill the cells with context-aware seeds

Never create an empty notebook. Always seed with 3–5 cells that give the user an immediate starting point:

1. **First cell: markdown** — title + one-sentence context of what the notebook is for
2. **Second cell: markdown or code** — if an MCP data source is connected, a starter query that returns something visible (e.g. `SELECT * FROM {table} LIMIT 10`). Otherwise a markdown cell describing the next step
3. **Third cell: code** — a transformation or a visualization that uses the output of step 2. Use `varname` on the SQL cell (`varname: "rows"`) and reference it in the JS cell
4. **Last cell: markdown** — a short "to you to play" note inviting the user to add cells, edit, or fork

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

### Step 4 — Share and fork

After creating the notebook, mention to the user that they can:
- Click `share` in the toolbar to open the export modal (hyperskill link for in-session sharing, markdown/png/json for external export)
- Switch to `view` mode (read-only, no controls visible) when presenting to someone
- Access the `⟲ history` panel to see the trace of edits, and restore deleted cells

For hackathon contexts, prefer seeding a **document** layout (comments + avatars) so participants feel they are joining a shared space.

## Examples

### Generic CSV / table playground
```
// user: "I need a playground to play with this CSV"
widget_display({name: "notebook-compact", params: {
  title: "CSV playground",
  cells: [
    {type: "md", content: "### CSV playground\n\nRun the SQL cell to see the first rows, then iterate."},
    {type: "sql", content: "select * from source limit 20", varname: "rows"},
    {type: "js", content: "// summarize, chart, or filter rows here"}
  ]
}})
```

### Collaborative analysis
```
// user: "Set up a notebook my team can edit together"
widget_display({name: "notebook-document", params: {
  title: "Team analysis",
  cells: [
    {type: "md", content: "Kick-off: describe the question here."},
    {type: "sql", content: "select * from source limit 10"},
    {type: "md", content: "Your findings: add thoughts, highlights (<mark>key sentence</mark>), and comments on the code cells above."}
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
- **Missing `varname` on SQL cells** (in compact layout): the named output is what the compact layout showcases. Without it, the notebook loses half its reactive story.
- **Inventing UUIDs or fork IDs**: leave `id` and `forkId` unset — the widget generates sensible defaults. Only pass `id` when restoring an existing notebook.

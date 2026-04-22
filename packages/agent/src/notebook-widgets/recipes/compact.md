---
widget: notebook-compact
description: Reactive minimalist notebook with a left gutter showing cell types and named outputs. Cells chain via variable names (→ rows, → df) and display fresh/stale status. Minimal chrome, ideal for quick data exploration.
schema:
  type: object
  properties:
    id:
      type: string
      description: Unique notebook identifier (for save/share via hyperskill)
    title:
      type: string
      description: Notebook title
    mode:
      type: string
      enum: [edit, view]
      description: edit allows run/edit/reorder; view hides all controls for read-only display
    cells:
      type: array
      description: Ordered list of cells (markdown, sql, js)
      items:
        type: object
        required: [type, content]
        properties:
          type:
            type: string
            enum: [md, sql, js]
          content:
            type: string
            description: Cell source (markdown text or code)
          name:
            type: string
            description: Optional cell name
          varname:
            type: string
            description: Named output variable (code cells only), displayed as → varname
          hideSource:
            type: boolean
          hideResult:
            type: boolean
---

## When to use

Use `notebook-compact` when the user wants to explore data quickly with a minimal, reactive interface. Ideal for:
- Iterative SQL / JS exploration where output variables feed each other
- Quick prototyping where chrome should fade into the background
- Hackathon playgrounds where users expect a familiar "type, see, share" flow
- Situations where the reactive dataflow (fresh/stale status) helps the user reason about stale results

Prefer over `notebook-workspace` when there is no multi-source concern and no publish/dashboard end goal.
Prefer over `notebook-document` when collaboration and comments are not central.
Prefer over `notebook-editorial` when the result is a working session, not a publication.

## How to use

1. **Create the widget** with a title and 2–4 seed cells:
   ```
   widget_display({name: "notebook-compact", params: {
     title: "Exploration",
     cells: [
       {type: "md", content: "### Quick look\n\nLet's inspect the data."},
       {type: "sql", content: "select * from source limit 10", varname: "rows"},
       {type: "js", content: "console.table(rows)"}
     ]
   }})
   ```

2. **Name outputs** (`varname`) on the SQL/JS cells so the gutter displays `→ varname` and downstream cells can reference them. Named outputs are injected into the scope of every JS cell executed after them; if a downstream cell's code mentions `varname` (word-boundary match), it is flagged **stale** whenever the upstream cell re-runs, so the user sees what needs replaying.

3. **Start markdown cells with a heading** (`### Title`) — the first line renders larger and gives the cell an anchor.

4. **Let the user iterate** — they can add cells with `+ md / + sql / + js`, reorder via the drag handle, toggle source/result, and run cells with the green pill button.

## Notes

- The Run button lives at the left of each cell's title row, right after the type label.
- Stop (red pill) appears while running, with a live elapsed timer.
- After a run, Run becomes the replay button (same green pill, re-click to re-run).
- **SQL cells** are dispatched to the first matching `*_query_sql` tool on the connected MCP data server (auto-detected).
- **JS cells** execute inside an isolated Web Worker with upstream named outputs injected as scope — `console.log` / `console.table` results are captured and rendered inline.
- Deletions prompt a confirmation modal and are recorded in the history panel; they can be restored from there.
- `mode: "view"` hides all controls (run, delete, drag, add), making the notebook read-only.

## Left pane — connected data servers

When one or more MCP data servers are connected, a collapsible **left pane** (bookmark-bar styling, collapsed by default) lists their recipes and tools. Clicking any recipe opens it in a viewer modal; each fenced code block inside the recipe has a `↳ inject` button that drops the snippet into the notebook as a new cell.

Two toolbar buttons flank this pane:

- **`+ md`** — 3-tab modal (New / File / URL) to create a markdown cell from scratch, a local `.md` file, or a remote URL.
- **`+ recipe`** — 3-tab modal (Browser / File / URL) to import a recipe from a connected server, a local `.recipe.md` file, or a URL.

## Share & publish

The `share` button offers **four formats**:

- **Hyperskill link** — copies both the canonical Hyperskill URL and a short domain-scoped URL (`?n=<token>`). Opens at `nb.hyperskills.net` (read-only public viewer) when mode is `view`.
- **Markdown** — downloads a `.md` file with the notebook content.
- **PNG** — snapshots the rendered notebook to an image.
- **JSON** — exports the full widget state for programmatic reuse.

## Integration with connected data servers

If a MCP **data** server is connected (e.g. `tricoteuses`, `metmuseum`), BEFORE seeding cells:

1. Call `{server}_list_recipes()` or `{server}_search_recipes(query)` to find recipes that match the user's intent.
2. Call `{server}_list_tools()` to see available tables/endpoints.
3. For each high-signal recipe or table, seed ONE cell that demonstrates it: an SQL `SELECT ... LIMIT 10`, a `run_script` call, or a short markdown note.
4. Pass the server metadata via the `servers:` param so the UI can render the server menu modal and populate the left pane:

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

If NO data server is connected, seed generic markdown-only cells that explain the notebook's purpose and invite the user to connect an MCP server.

**Filter rule**: only include MCP *data* servers (`kind: 'data'`) in `servers:`. Do NOT include WebMCP UI servers like `autoui` — they don't expose queryable data and would clutter the menu.

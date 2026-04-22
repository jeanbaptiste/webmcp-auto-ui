---
widget: notebook-document
description: Collaborative notebook styled as a shared document. Optional editor avatars at the top (opt-in), inline highlights in prose, optional margin comments next to cells (editable + threaded replies). Minimal cell chrome, reads as a report with conversation around it.
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
    presence:
      type: array
      description: Optional list of editors to display as avatars at the top (opt-in). When absent or empty, no presence indicator is rendered.
      items:
        type: object
        properties:
          name:
            type: string
          color:
            type: string
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
            description: For md cells, markdown is rendered and sanitized (use <mark> for inline highlights).
          hideSource:
            type: boolean
          hideResult:
            type: boolean
          comment:
            type: object
            description: Optional margin comment attached to a code cell. Editable after creation; supports replies.
            properties:
              who:
                type: string
              when:
                type: string
                description: ISO timestamp or relative label. Relative time is recomputed from lastEditAt at render.
              body:
                type: string
              replies:
                type: array
                items:
                  type: object
                  properties:
                    who: {type: string}
                    when: {type: string}
                    body: {type: string}
---

## When to use

Use `notebook-document` when the notebook is meant to be read and discussed by a team:
- Shared analyses where colleagues leave margin comments on specific cells
- Onboarding guides, knowledge docs, incident retros
- Any context where the notebook should feel like a Google Doc / Notion page, not a developer tool

Prose cells can contain `<mark>` highlights inline to draw attention to a sentence, and code cells can carry an optional margin comment object showing who commented and when — comments are editable after creation and support threaded replies via a `+ reply` button.

## How to use

1. **Create with prose-heavy seed content** and inline highlights for emphasis:
   ```
   widget_display({name: "notebook-document", params: {
     title: "Weekly review",
     cells: [
       {type: "md", content: "Here is this week's summary. <mark>Pay attention to this metric.</mark> More context follows."},
       {type: "sql", content: "select ...", comment: {who: "reviewer", when: "2m", body: "Can we filter X here?"}},
       {type: "js", content: "// visualization"}
     ]
   }})
   ```

2. **Attach comments to code cells** by adding a `comment` object. The cell row splits into two columns (cell + comment) only when a comment exists. Comments can be edited inline after creation, and replies can be threaded under them via `+ reply`.

3. **Keep prose short** — the layout punishes walls of text. Break them into several markdown cells with their own handles.

## Notes

- Every cell (prose or code) has its own drag handle for reordering.
- Prose cells are rendered via an HTML-sanitizing markdown pipeline — `<mark>` is preserved, script/style and other dangerous tags are stripped (XSS closed).
- `<mark>` inside markdown renders with an amber tint; use sparingly.
- **Presence is opt-in**: the row of editor avatars and the "X editors online" label appear **only** when the `presence` param is explicitly provided with at least one entry. Without `presence`, nothing is rendered — no fake collaborators.
- A timestamp under the title reads `edited Xs ago`, computed in real time from the notebook's last edit.
- The footer shows a single `share` link that opens the share modal. (Live invite/collaboration is not available in this build.)
- **SQL cells** dispatch to the connected MCP server's `*_query_sql` tool (auto-detected). **JS cells** run in an isolated Web Worker with upstream named outputs in scope.
- Like the other notebook widgets, `mode: "view"` removes all editing and running controls.

## Left pane — resources from connected servers

A collapsible **left pane** (bookmark-bar styling, collapsed by default) lists recipes and tools exposed by connected MCP data servers. Clicking any recipe opens a viewer modal; fenced code blocks expose a `↳ inject` button that drops the snippet in as a new cell.

Two toolbar buttons flank this pane:

- **`+ md`** — 3-tab modal (New / File / URL) to create a markdown cell from scratch, a local `.md` file, or a URL.
- **`+ recipe`** — 3-tab modal (Browser / File / URL) to import a recipe from a connected server, a local `.recipe.md` file, or a URL.

## Share

The `share` button offers **four formats**:

- **Hyperskill link** — copies both the canonical Hyperskill URL and a short domain-scoped URL (`?n=<token>`). The read-only public viewer lives at `nb.hyperskills.net`.
- **Markdown** — downloads a `.md` file.
- **PNG** — snapshots the rendered document.
- **JSON** — exports full widget state.

## Integration with connected data servers

When a MCP **data** server is connected (for instance `tricoteuses` or `metmuseum`), the document should open on real material rather than empty placeholders. Before seeding cells, the agent takes a short discovery pass:

1. It calls `{server}_list_recipes()` or `{server}_search_recipes(query)` to locate recipes aligned with the user's topic.
2. It calls `{server}_list_tools()` to learn which tables and endpoints the server exposes.
3. For each relevant recipe or table, it seeds a single cell that grounds the document — a short SQL `SELECT ... LIMIT 10`, a `run_script` call, or a prose cell that introduces what the data shows. A margin `comment` on a code cell is a natural way to flag an open question for collaborators.
4. It passes the server metadata through the `servers:` param so the share affordance and the left pane reflect what is in play:

   ```ts
   widget_display({
     name: 'notebook-document',
     params: {
       title: '...',
       cells: [...],
       servers: [{ name: 'tricoteuses', url: 'https://...', kind: 'data' }]
     }
   })
   ```

When no data server is connected, seed a prose-only skeleton that frames the discussion and invites the reader (or a colleague) to link an MCP server.

**Filter rule**: only MCP *data* servers (`kind: 'data'`) appear in `servers:`. WebMCP UI servers such as `autoui` are excluded — they carry no queryable data and would clutter the collaborative view.

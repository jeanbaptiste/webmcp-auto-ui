---
widget: notebook-editorial
description: Publication-ready notebook with serif prose and inline cells, all drag-and-droppable in a single ordered flow. Inspired by Observable — cells can be prose paragraphs, sql queries, or js charts, mixed freely in any order to build an article-like narrative.
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
    kicker:
      type: string
      description: Small uppercase label above the title (e.g. "analysis", "memo", "brief"). Editable inline. Defaults to "untitled".
    forkId:
      type: string
      description: Short identifier shown in the footer next to "share" (e.g. "4c7a·9f21"). Purely cosmetic — no fork/clone semantics implemented. Defaults to a slice of the notebook id.
    cells:
      type: array
      description: Mixed flow of prose and code cells. All share the same ordering and can be reordered together.
      items:
        type: object
        required: [type, content]
        properties:
          type:
            type: string
            enum: [md, sql, js]
            description: md = prose paragraph (markdown rendered + sanitized), sql = query cell with table output, js = code cell with chart output
          content:
            type: string
          hideSource:
            type: boolean
          hideResult:
            type: boolean
---

## When to use

Use `notebook-editorial` when the notebook is meant to be published or shared as a finished artifact:
- Research memos with code appendices visible on demand
- Blog-style writeups mixing narrative and runnable code
- Final deliverables where prose leads and code supports

The distinguishing feature: prose paragraphs and code cells share a single ordered list, both drag-and-droppable with the same handle. This lets users rearrange the story freely without thinking about "sections".

## How to use

1. **Start with prose-first seed content** and intersperse code cells:
   ```
   widget_display({name: "notebook-editorial", params: {
     title: "Q3 observations",
     kicker: "memo",
     cells: [
       {type: "md", content: "This memo covers the highlights of last quarter."},
       {type: "md", content: "We first look at revenue, then at churn."},
       {type: "sql", content: "select * from source limit 10"},
       {type: "md", content: "The table above suggests..."},
       {type: "js", content: "// render a chart"}
     ]
   }})
   ```

2. **Use prose paragraphs as transitions** between code blocks. The layout emphasizes reading flow.

3. **Code cells render their result in the editorial style**:
   - SQL cells show a minimal mono-spaced table (live data from the connected MCP server's `*_query_sql` tool).
   - JS cells run in an isolated Web Worker with upstream named outputs in scope.

4. **Reorder cells freely** — the user can drag a prose paragraph from the bottom to the top, or swap a chart and its introduction, all via the same handle.

## Notes

- The serif font (EB Garamond, with Georgia fallback) applies only to prose content inside this widget — it signals "publication" the moment the user sees it.
- The **kicker** above the title ("analysis", "memo", "internal") is editable inline — click to rename. Keep it short.
- Prose cells are rendered via an HTML-sanitizing markdown pipeline: markdown syntax is resolved, unsafe tags are stripped (XSS closed), `<mark>` and other editorial tags are preserved.
- The footer shows `share · forkId`. `forkId` is a purely cosmetic identifier next to the share button — it does not clone or duplicate the notebook (fork semantics are not implemented).
- Run / Stop controls are at the left of each code cell's header, same as the other notebook layouts.
- Unlike the other widgets, `notebook-editorial` does not separate prose and code into different flows — they are the same flow in one list.

## Left pane — resources from connected servers

A collapsible **left pane** (bookmark-bar styling, collapsed by default) lists recipes and tools exposed by connected MCP data servers. Clicking any recipe opens a viewer modal; fenced code blocks expose a `↳ inject` button that drops the snippet into the article flow as a new cell.

Two toolbar buttons flank this pane:

- **`+ md`** — 3-tab modal (New / File / URL) to insert a prose paragraph from scratch, a local `.md` file, or a URL.
- **`+ recipe`** — 3-tab modal (Browser / File / URL) to import a recipe from a connected server, a local `.recipe.md` file, or a URL.

## Share

The `share` button in the footer offers **four formats**:

- **Hyperskill link** — copies both the canonical Hyperskill URL and a short domain-scoped URL (`?n=<token>`). The read-only public viewer lives at `nb.hyperskills.net`.
- **Markdown** — downloads a `.md` file.
- **PNG** — snapshots the rendered article.
- **JSON** — exports full widget state.

## Integration with connected data servers

An editorial piece earns its weight when the prose is anchored to real material. If a MCP **data** server is connected (say `tricoteuses` or `metmuseum`), the agent should — before composing the memo — go and see what the server has to offer:

1. Call `{server}_list_recipes()` or `{server}_search_recipes(query)` to find recipes that speak to the subject at hand.
2. Call `{server}_list_tools()` to survey the available tables and endpoints.
3. For each recipe or table worth citing, seed one cell that lets the reader touch the evidence — a modest SQL `SELECT ... LIMIT 10`, a `run_script` call, or a prose paragraph that introduces the figure to come. Let prose and code alternate; the editorial flow is built for exactly that.
4. Pass the server metadata through the `servers:` param so the footer's share affordance, the left pane, and the connect modal reflect the provenance of the piece:

   ```ts
   widget_display({
     name: 'notebook-editorial',
     params: {
       title: '...',
       kicker: 'memo',
       cells: [...],
       servers: [{ name: 'tricoteuses', url: 'https://...', kind: 'data' }]
     }
   })
   ```

When no data server is connected, seed a prose-first skeleton that stakes out the argument and gently invites the reader to connect an MCP server so the memo can take on flesh.

**Filter rule**: only MCP *data* servers (`kind: 'data'`) belong in `servers:`. WebMCP UI servers like `autoui` are kept out — they hold no queryable material and have no place in the editorial masthead.

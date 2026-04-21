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
      description: Small uppercase label above the title (e.g. "analysis", "memo", "brief"). Defaults to "untitled".
    forkId:
      type: string
      description: Short identifier shown in the footer next to "share" (e.g. "4c7a·9f21"). Defaults to a slice of the notebook id.
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
            description: md = prose paragraph, sql = query cell with table output, js = code cell with chart output
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
   - SQL cells show a minimal mono-spaced table
   - JS cells show a chart area with labeled bars

4. **Reorder cells freely** — the user can drag a prose paragraph from the bottom to the top, or swap a chart and its introduction, all via the same handle.

## Notes

- The serif font (EB Garamond, with Georgia fallback) applies only to prose content inside this widget — it signals "publication" the moment the user sees it.
- The kicker above the title ("analysis", "memo", "internal") is editorial shorthand; keep it short.
- The footer shows `share · forkId`, which is clickable to open the share modal.
- Run / Stop controls are at the left of each code cell's header, same as the other notebook layouts.
- Unlike the other widgets, `notebook-editorial` does not separate prose and code into different flows — they are the same flow in one list.

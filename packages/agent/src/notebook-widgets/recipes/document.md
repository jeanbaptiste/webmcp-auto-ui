---
widget: notebook-document
description: Collaborative notebook styled as a shared document. Avatars of editors at the top, inline highlights in prose, optional margin comments next to cells. Minimal cell chrome, reads as a report with conversation around it.
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
            description: For md cells, HTML is supported (use <mark> for inline highlights).
          hideSource:
            type: boolean
          hideResult:
            type: boolean
          comment:
            type: object
            description: Optional margin comment attached to a code cell
            properties:
              who:
                type: string
              when:
                type: string
                description: Relative time shown as-is (e.g. "2m", "just now")
              body:
                type: string
---

## When to use

Use `notebook-document` when the notebook is meant to be read and discussed by a team:
- Shared analyses where colleagues leave margin comments on specific cells
- Onboarding guides, knowledge docs, incident retros
- Any context where the notebook should feel like a Google Doc / Notion page, not a developer tool

Prose cells can contain `<mark>` highlights inline to draw attention to a sentence, and code cells can carry an optional margin comment object showing who commented and when.

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

2. **Attach comments to code cells** by adding a `comment` object. The cell row splits into two columns (cell + comment) only when a comment exists.

3. **Keep prose short** — the layout punishes walls of text. Break them into several markdown cells with their own handles.

## Notes

- Every cell (prose or code) has its own drag handle for reordering.
- Comments can only be attached to code cells at creation time in the current widget version; prose cells do not carry comments.
- `<mark>` inside markdown renders with an amber tint; use sparingly.
- The footer shows an "invite · share" link that opens the share modal.
- Like the other notebook widgets, `mode: "view"` removes all editing and running controls.

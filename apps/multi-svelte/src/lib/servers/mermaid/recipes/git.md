---
widget: mermaid-git
description: Git graph showing commits, branches, checkouts, and merges.
schema:
  type: object
  properties:
    definition:
      type: string
      description: "Raw Mermaid gitGraph definition"
    actions:
      type: array
      description: "Sequence of git actions to render"
      items:
        type: object
        required: [type]
        properties:
          type:
            type: string
            enum: [commit, branch, checkout, merge]
          name:
            type: string
            description: "Branch name (for branch/checkout/merge)"
          message:
            type: string
            description: "Commit message"
          tag:
            type: string
            description: "Tag for commit"
          commitType:
            type: string
            enum: [NORMAL, REVERSE, HIGHLIGHT]
---
Renders a git graph. Provide either a raw `definition` or an `actions` array describing commits, branches, checkouts, and merges.

## How
1. Call `mermaid_webmcp_widget_display({name: "git", params: {definition: "gitGraph\n  commit\n  branch feature\n  checkout feature\n  commit\n  checkout main\n  merge feature"}})`

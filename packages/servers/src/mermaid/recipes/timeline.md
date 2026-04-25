---
widget: mermaid-timeline
description: Timeline showing events organized by time periods/sections.
schema:
  type: object
  properties:
    definition:
      type: string
      description: "Raw Mermaid timeline definition"
    title:
      type: string
    sections:
      type: array
      items:
        type: object
        required: [period, events]
        properties:
          period:
            type: string
            description: "Time period label"
          events:
            type: array
            items:
              type: string
---
Renders a timeline. Provide either a raw `definition` or structured `sections` with periods and events.

## How
1. Call `mermaid_webmcp_widget_display({name: "timeline", params: {definition: "timeline\n  title History\n  2020 : Event A\n  2021 : Event B\n  2022 : Event C"}})`

## Example
```
mermaid_webmcp_widget_display({name: "mermaid-timeline", params: {definition: "timeline\n  title History of the Web\n  1991 : HTML invented by Tim Berners-Lee\n  1995 : JavaScript created\n       : PHP launched\n  2005 : Ajax popularized\n       : Web 2.0 era begins\n  2010 : HTML5 standardized\n  2015 : ES6 released\n  2022 : Web Components mature"}})
```

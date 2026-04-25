---
widget: rough-timeline
description: Vertical timeline of events with dates and descriptions
schema:
  type: object
  required:
    - events
  properties:
    events:
      type: array
      items:
        type: object
        required:
          - date
          - label
        properties:
          date:
            type: string
            description: Date or period label
          label:
            type: string
            description: Event name
          description:
            type: string
            description: Optional event details
      description: Timeline events in chronological order
    title:
      type: string
      description: Chart title
---

## Timeline

Vertical timeline with date markers and event descriptions.

### Data format

- `events` — array of `{date, label, description?}` objects
- `title` — optional chart title

## How
1. Call `rough_webmcp_widget_display({name: "timeline", params: {events: [{date: "2024-01", label: "Founded"}, {date: "2024-06", label: "Seed Round"}, {date: "2025-01", label: "Launch"}], title: "Company Milestones"}})`

## Example
```
rough_webmcp_widget_display({name: "rough-timeline", params: {events: [{date: "Jan 2024", label: "Founded", description: "Company incorporated"}, {date: "Jun 2024", label: "Seed Round", description: "$1.2M raised"}, {date: "Jan 2025", label: "Public Launch"}], title: "Company Milestones"}})
```

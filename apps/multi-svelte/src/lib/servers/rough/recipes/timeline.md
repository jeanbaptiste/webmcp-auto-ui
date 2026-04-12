---
id: rough-timeline
name: Timeline
description: Vertical timeline of events with dates and descriptions
data:
  events:
    - { date: "2024-01", label: "Founded", description: "Company incorporated" }
    - { date: "2024-06", label: "Seed Round", description: "$2M raised" }
    - { date: "2025-01", label: "Launch", description: "Public beta released" }
    - { date: "2025-09", label: "Series A", description: "$15M raised" }
  title: "Company Milestones"
---

## Timeline

Vertical timeline with date markers and event descriptions.

### Data format

- `events` — array of `{date, label, description?}` objects
- `title` — optional chart title

## How
1. Call `rough_webmcp_widget_display({name: "timeline", params: {events: [{date: "2024-01", label: "Founded"}, {date: "2024-06", label: "Seed Round"}, {date: "2025-01", label: "Launch"}], title: "Company Milestones"}})`

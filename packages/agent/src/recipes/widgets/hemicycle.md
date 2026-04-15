---
widget: hemicycle
description: Parliamentary hemicycle with political groups
group: rich
schema:
  type: object
  required:
    - groups
  properties:
    title:
      type: string
    groups:
      type: array
      items:
        type: object
        required:
          - id
          - label
          - seats
          - color
        properties:
          id:
            type: string
          label:
            type: string
          seats:
            type: number
          color:
            type: string
    totalSeats:
      type: number
---

## When to use
Visualize the composition of a parliamentary assembly or any set distributed into groups with proportions. Ideal for election results and seat distribution.

## How to use
1. Fetch composition data via MCP (groups, seat counts, colors)
2. Call `autoui_webmcp_widget_display('hemicycle', { title: 'National Assembly', groups: [{ id: 'lfi', label: 'LFI', seats: 75, color: '#cc2443' }, { id: 'ren', label: 'Renaissance', seats: 170, color: '#ffeb00' }], totalSeats: 577 })`

## Common mistakes
- Forgetting one of the 4 required fields in each `groups` object (id, label, seats, color are ALL required)
- Not providing a valid hexadecimal color

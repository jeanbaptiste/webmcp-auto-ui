---
widget: pie-chart
description: Pie chart for proportional data visualization (Mermaid.js)
group: mermaid
schema:
  type: object
  properties:
    definition:
      type: string
      description: "Raw Mermaid pie syntax"
    title:
      type: string
      description: "Chart title — used with structured data"
    slices:
      type: array
      description: "Structured slices [{label, value}] — alternative to definition"
      items:
        type: object
        properties:
          label:
            type: string
          value:
            type: number
---

## When to use
For showing proportions, distributions, budget breakdowns, survey results. Best with 2-8 categories.

## How
**Raw syntax:**
```
widget_display('pie-chart', { definition: "pie title Monthly Budget\n  \"Salaries\" : 45\n  \"Rent\" : 25\n  \"Equipment\" : 15\n  \"Marketing\" : 10\n  \"Other\" : 5" })
```

**Structured data:**
```
widget_display('pie-chart', {
  title: "Monthly Budget",
  slices: [
    { label: "Salaries", value: 45 },
    { label: "Rent", value: 25 },
    { label: "Equipment", value: 15 },
    { label: "Marketing", value: 10 },
    { label: "Other", value: 5 }
  ]
})
```

## Common errors
- Values are proportional (Mermaid calculates percentages automatically)
- Labels must be quoted in raw syntax: `"Label" : value`
- Avoid more than 8-10 slices for readability

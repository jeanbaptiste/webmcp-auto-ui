---
widget: observable-plot-tree
description: Hierarchical tree diagram from an array of path strings.
group: observable-plot
schema:
  type: object
  required: [paths]
  properties:
    title: { type: string }
    paths: { type: array, description: "Array of delimited path strings e.g. ['a/b','a/c']" }
    delimiter: { type: string, description: "Path separator (default '/')" }
    stroke: { type: string }
    fill: { type: string }
---

## When to use
Directory trees, taxonomies, org charts.

## Example
```
observable-plot_webmcp_widget_display({name: "observable-plot-tree", params: { paths: ['root/a/b','root/a/c','root/d'] }})
```

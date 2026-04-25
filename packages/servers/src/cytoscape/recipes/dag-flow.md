---
widget: dag-flow
description: Directed acyclic graph with top-to-bottom flow layout
schema:
  type: object
  properties:
    elements:
      type: array
      description: Array of Cytoscape elements forming a DAG. Each element is either a node ({data:{id, label}}) or an edge ({data:{source, target}}), never both.
      items:
        type: object
        properties:
          data:
            type: object
            anyOf:
              - required: [id]
                not:
                  required: [source]
                properties:
                  id:
                    type: string
                  label:
                    type: string
              - required: [source, target]
                not:
                  required: [id]
                properties:
                  source:
                    type: string
                  target:
                    type: string
    layout:
      type: object
      description: Optional layout overrides
    style:
      type: array
      description: Optional Cytoscape style array
  required: [elements]
---

## Usage

Renders a directed acyclic graph (DAG) with a top-to-bottom flow using the Dagre layout. Perfect for workflow diagrams, pipelines, and dependency graphs where direction matters.

## How

1. Call `cytoscape_webmcp_widget_display({name: "dag-flow", params: {elements: [{data: {id: "start", label: "Start"}}, {data: {id: "process", label: "Process"}}, {data: {id: "review", label: "Review"}}, {data: {id: "end", label: "End"}}, {data: {source: "start", target: "process"}}, {data: {source: "process", target: "review"}}, {data: {source: "review", target: "end"}}]}})`

## Example
```
cytoscape_webmcp_widget_display({name: "dag-flow", params: {elements: [{data: {id: "start", label: "Start"}}, {data: {id: "process", label: "Process"}}, {data: {id: "review", label: "Review"}}, {data: {id: "end", label: "End"}}, {data: {source: "start", target: "process"}}, {data: {source: "process", target: "review"}}, {data: {source: "review", target: "end"}}]}})
```

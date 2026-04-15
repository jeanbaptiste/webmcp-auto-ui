---
widget: js-sandbox
description: Isolated JavaScript sandbox with HTML/CSS
group: advanced
schema:
  type: object
  required:
    - code
  properties:
    title:
      type: string
    code:
      type: string
    html:
      type: string
    css:
      type: string
    height:
      type: string
---

## When to use
For executing custom JavaScript code in an isolated environment (iframe) — interactive demos, prototypes, custom visualizations, bespoke widgets that no other widget covers.

## How to use
1. Write the JS code, and optionally the associated HTML/CSS
2. Call `autoui_webmcp_widget_display('js-sandbox', { title: 'Interactive demo', code: 'document.getElementById("app").textContent = "Hello!"', html: '<div id="app"></div>', css: '#app { font-size: 24px; }', height: '200px' })`

## Common mistakes
- The code runs in an isolated iframe — no access to the parent DOM or the app's global variables
- Always provide `html` if the JS code manipulates the DOM (otherwise there is nothing to display)
- Do not use this widget when a specialized widget exists (chart-rich, d3, etc.)

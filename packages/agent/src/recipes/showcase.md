---
id: showcase-mixed-widgets
name: Showcase a mix of widgets across categories
components_used: [stat-card, chart-rich, data-table, deckgl-scatterplot, kv]
when: the user asks for a generic widget showcase, demo, or sampler — phrases like "show me widgets", "demo", "showcase", "what can you display?"
servers: [autoui, deckgl]
layout:
  type: grid
  columns: 3
  arrangement: KPIs row, then a chart and a table side-by-side, then a map and a kv
---

## When to use

The user wants to see what kinds of widgets the system can render, without specifying a topic. Typical phrases:
- "Montre-moi des widgets pour tester"
- "Show me a demo / a showcase"
- "What can you render?"
- "I just want to see widgets"

This recipe deliberately covers **multiple widget families** (KPI, chart, table, map, key/value) so the user gets a representative sampler in a single canvas.

## How to use

Mount **6 widgets** in this order, each with realistic demo data. **Do NOT list widget names as text labels on a map** — that defeats the purpose. Each widget must render real data of its own type.

Use exact widget names and exact parameter keys below.

1. **3 stat-cards** in a row (`stat-card`, keys: `label`, `value`, `delta?`, `unit?`):
   ```
   widget_display({name: "stat-card", params: {label: "Active users", value: 12480, unit: "users", delta: 8.2, variant: "success"}})
   widget_display({name: "stat-card", params: {label: "Revenue (Q1)", value: 184200, unit: "€", delta: 12.4, variant: "success"}})
   widget_display({name: "stat-card", params: {label: "Churn", value: 3.1, unit: "%", delta: -0.4, variant: "warning"}})
   ```

2. **A chart** (`chart-rich`, keys: `type`, `labels`, `data`):
   ```
   widget_display({name: "chart-rich", params: {
     title: "Signups (last 6 months)",
     type: "line",
     labels: ["Jan", "Feb", "Mar", "Apr", "May", "Jun"],
     data: [{label: "Signups", values: [120, 145, 162, 198, 240, 285]}]
   }})
   ```

3. **A table** (`data-table`, keys: `rows`, `columns`):
   ```
   widget_display({name: "data-table", params: {
     title: "Plans",
     columns: [
       {key: "plan", label: "Plan"},
       {key: "users", label: "Users"},
       {key: "mrr", label: "MRR"},
       {key: "delta", label: "Δ 30d"}
     ],
     rows: [
       {plan: "Free", users: 8420, mrr: "€0", delta: "+5%"},
       {plan: "Pro", users: 3120, mrr: "€62 400", delta: "+11%"},
       {plan: "Team", users: 740, mrr: "€88 800", delta: "+18%"},
       {plan: "Enterprise", users: 200, mrr: "€33 000", delta: "+4%"}
     ]
   }})
   ```

4. **A map** with a few markers (`deckgl-scatterplot`, key: `points`):
   ```
   widget_display({name: "deckgl-scatterplot", params: {
     points: [
       {lng: 2.3522, lat: 48.8566, radius: 600, color: [255, 100, 100]},
       {lng: 4.8357, lat: 45.7640, radius: 500, color: [100, 200, 255]},
       {lng: 5.3698, lat: 43.2965, radius: 500, color: [120, 255, 120]}
     ],
     center: [3.5, 46.5], zoom: 5
   }})
   ```

5. **A kv** for metadata / sources (`kv`, key: `rows` with `[[k, v], ...]`):
   ```
   widget_display({name: "kv", params: {
     title: "About this showcase",
     rows: [
       ["Source", "Demo dataset"],
       ["Generated", "live"],
       ["Refreshed", "just now"]
     ]
   }})
   ```

## Important

- **Do NOT** call a single text/label widget that only contains widget *names*. Each widget shown must be a different visual type with its own real data.
- For `kv`, the property is `rows` (not `pairs`), and each item is a `[key, value]` array of strings.
- For `chart`, values are `[label, value]` tuples; for `chart-rich`, values are objects `{label, values}` with parallel arrays — pick the matching shape.
- For a **cartography**-only showcase use `showcase-carto`; for a **dashboard / charts** showcase use `showcase-dashboard`.
- Keep total widgets between 5 and 8 — beyond that the canvas becomes unreadable.

## Output text

After the tool calls, return a single sentence such as: "Voici un échantillon de 5 widgets — KPIs, courbe, table, carte et métadonnées."

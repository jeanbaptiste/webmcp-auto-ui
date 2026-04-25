---
id: showcase-dashboard
name: Showcase analytics dashboard widgets — Tremor, ECharts, Observable Plot, Recharts, Nivo, Perspective
when: the user asks for a dashboard / analytics / charts demo, e.g. "showcase dashboard", "demo dashboard", "show me charts", "analytics demo"
servers: [echarts, observable-plot, recharts, nivo, perspective, tremor, chartjs, d3]
components_used: [tremor-kpi-card, echarts-line, observable-plot-dot, recharts-bar, nivo-pie, perspective-table]
layout:
  type: grid
  columns: 3
  arrangement: KPI strip on top, then charts in a grid, table at the bottom
---

## When to use

The user wants to see the **analytics / dashboard** capabilities of the system — non-cartographic visualizations powered by JS chart libraries. Typical phrases:
- "Montre-moi un showcase dashboard"
- "Demo analytics / charts"
- "Show me what charts you can do"
- "Showcase ECharts / Observable / Recharts"

This recipe covers the four major dashboard widget families: **KPIs**, **time series & comparisons**, **distributions & breakdowns**, **interactive tables**.

## How to use

Mount **6-7 widgets** drawn from different chart libraries to demonstrate variety. Pick one widget per server when possible. **Do not collapse everything into a single chart** — the showcase value is the variety.

Use exact widget names and exact parameter keys below. Schemas come from each widget's recipe.

1. **3 KPI cards** in a row (`tremor-kpi-card`, keys: `title`, `metric`, `delta`, `deltaType`):
   ```
   widget_display({name: "tremor-kpi-card", params: {title: "MRR", metric: "€ 184 200", delta: "+12.4%", deltaType: "increase"}})
   widget_display({name: "tremor-kpi-card", params: {title: "Active users", metric: "12 480", delta: "+8.2%", deltaType: "increase"}})
   widget_display({name: "tremor-kpi-card", params: {title: "Churn", metric: "3.1 %", delta: "-0.4 pts", deltaType: "decrease"}})
   ```

2. **Time-series line chart** (`echarts-line`, keys: `categories`, `series`):
   ```
   widget_display({name: "echarts-line", params: {
     title: "Signups vs activations",
     categories: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug"],
     series: [
       {name: "Signups", data: [120, 145, 162, 198, 240, 285, 312, 358]},
       {name: "Activations", data: [80, 102, 121, 148, 188, 225, 252, 290]}
     ],
     smooth: true
   }})
   ```

3. **Scatter / dot plot** (`observable-plot-dot`, keys: `data`, `xKey`, `yKey`, `fill`):
   ```
   widget_display({name: "observable-plot-dot", params: {
     title: "Cohort distribution",
     data: [
       {x: 1.2, y: 3.4, group: "A"}, {x: 2.5, y: 5.1, group: "A"}, {x: 3.8, y: 4.2, group: "B"},
       {x: 4.1, y: 6.8, group: "B"}, {x: 5.4, y: 5.9, group: "C"}, {x: 6.2, y: 7.3, group: "C"},
       {x: 7.0, y: 6.1, group: "A"}, {x: 8.3, y: 8.4, group: "B"}
     ],
     xKey: "x", yKey: "y", fill: "group", tip: true
   }})
   ```

4. **Bar chart** (`recharts-bar`, keys: `rows`, `bars`, `xKey`):
   ```
   widget_display({name: "recharts-bar", params: {
     title: "Users by plan",
     rows: [
       {plan: "Free", users: 8420},
       {plan: "Pro", users: 3120},
       {plan: "Team", users: 740},
       {plan: "Enterprise", users: 200}
     ],
     xKey: "plan",
     bars: [{dataKey: "users", color: "#4f8cff"}]
   }})
   ```

5. **Pie / donut** (`nivo-pie`, key: `data` with `{id, label, value}`):
   ```
   widget_display({name: "nivo-pie", params: {
     data: [
       {id: "direct",  label: "Direct",  value: 38},
       {id: "search",  label: "Search",  value: 27},
       {id: "ref",     label: "Referral", value: 18},
       {id: "social",  label: "Social",  value: 12},
       {id: "email",   label: "Email",   value: 5}
     ],
     innerRadius: 0.5
   }})
   ```

6. **Interactive datagrid** (`perspective-table`, key: `rows`):
   ```
   widget_display({name: "perspective-table", params: {
     title: "Revenue by region & plan",
     rows: [
       {date: "2026-01", region: "EU", plan: "Pro",  revenue: 18400},
       {date: "2026-01", region: "US", plan: "Pro",  revenue: 22100},
       {date: "2026-02", region: "EU", plan: "Pro",  revenue: 19800},
       {date: "2026-02", region: "US", plan: "Pro",  revenue: 24200},
       {date: "2026-03", region: "EU", plan: "Team", revenue: 31200},
       {date: "2026-03", region: "US", plan: "Team", revenue: 38400}
     ]
   }})
   ```

7. **Optional 7th widget** for extra variety, if the corresponding server is activated:
   - `chartjs-radar` (multi-axis comparison),
   - `nivo-radar` (alternative radar),
   - `d3-force-graph` (mini network),
   - `recharts-area` (stacked area).

## Important

- **Variety wins**: pick widgets from *different* libraries. Don't stack 5 ECharts widgets — the goal is to demonstrate the breadth of the dashboard ecosystem.
- Use exactly the parameter keys above (`metric` not `value`, `delta` not `trend`, `deltaType` not `trendDir`, `categories` not `xAxis`, `rows` not `data` for recharts-bar / perspective-table, `fill` not `color` for observable-plot-dot).
- Use realistic dashboard data (revenue, users, traffic sources, plans, regions). Avoid abstract `[1, 2, 3]` series.
- For a **cartography**-focused showcase, use `showcase-carto` instead.
- For a **mixed** showcase (carto + dashboard + others), use `showcase`.

## Output text

Return a single sentence such as: "Showcase dashboard : 6 widgets — KPIs Tremor, série ECharts, scatter Observable Plot, bar Recharts, pie Nivo, table Perspective."

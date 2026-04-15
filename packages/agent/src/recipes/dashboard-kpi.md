---
id: compose-kpi-dashboard-from-aggregated-metrics
name: Compose a KPI dashboard from aggregated metrics
components_used: [stat-card, chart, table, kv]
when: MCP data contains numeric metrics, counters, totals, percentages, or aggregated statistics that warrant a visual dashboard
servers: []
layout:
  type: grid
  columns: 3
  arrangement: stat-cards in a row, chart + table below
---

## When to use

MCP results contain numeric metrics that need to be presented concisely. This recipe is cross-cutting: it applies regardless of the MCP server, as long as the data contains:
- Totals, counters, or averages (revenue, article count, participation, etc.)
- Percentages or ratios (churn rate, voter turnout, etc.)
- Time series of metrics (month-over-month, quarter-over-quarter trends)
- Breakdowns by category (by political group, by country, by object type)

## How to use

1. **Identify the 3–5 main KPIs** in the data returned by the MCP server
2. **Display each KPI as a stat-card** with clean formatting:
   ```
   component("stat-card", {label: "Revenue", value: "45 230 EUR", trend: "+12.4%", trendDir: "up", icon: "trending-up"})
   ```
   - Always format numbers: thousands separators, units, symbols
   - Add `trend` and `trendDir` if a comparison is available (vs. previous month, vs. previous year)
3. **If time series exist**, add a chart:
   ```
   component("chart", {type: "bar", labels: ["Q1", "Q2", "Q3", "Q4"], datasets: [{label: "Revenue", data: [98000, 112000, 128000, 142000]}]})
   ```
   - "bar" for comparisons between categories/periods
   - "line" for continuous trends
4. **If tabular details exist**, add a table:
   ```
   component("table", {columns: ["Category", "Value", "Change"], rows: [...]})
   ```
5. **For supplementary metadata**, use kv:
   ```
   component("kv", {pairs: [["Source", "data.gouv.fr"], ["Last updated", "2026-04-01"], ["Period", "Q1 2026"]]})
   ```

## Examples

### Parliamentary dashboard (Tricoteuses)
```
// After query_sql on votes for the legislature
component("stat-card", {label: "Public votes", value: "1 247", icon: "vote"})
component("stat-card", {label: "Amendments filed", value: "42 831", icon: "file-text"})
component("stat-card", {label: "Average participation", value: "61.3%", trend: "-2.1%", trendDir: "down"})
component("chart", {type: "bar", labels: months, datasets: [{label: "Votes/month", data: counts}]})
component("table", {columns: ["Group", "Amendments", "Adopted", "Rate"], rows: groupStats})
```

### Biodiversity dashboard (iNaturalist)
```
component("stat-card", {label: "Observations", value: "3 412", icon: "eye"})
component("stat-card", {label: "Unique species", value: "287", icon: "leaf"})
component("stat-card", {label: "Observers", value: "156", icon: "users"})
component("chart", {type: "line", labels: dates, datasets: [{label: "Observations/day", data: dailyCounts}]})
```

### News dashboard (Hacker News)
```
component("stat-card", {label: "Top stories", value: "500", icon: "newspaper"})
component("stat-card", {label: "Average score", value: "142", icon: "trending-up"})
component("stat-card", {label: "Average comments", value: "87", icon: "message-circle"})
component("table", {columns: ["Rank", "Title", "Score", "Comments"], rows: topStories})
```

## Common mistakes

- **Too many stat-cards**: beyond 5, switch to a `kv` or `table` for secondary metrics
- **Unformatted numbers**: displaying "45230" instead of "45 230" hurts readability
- **Missing units**: "45 230" means nothing without "EUR", "%", "observations", etc.
- **Chart without context**: always accompany a chart with stat-cards that surface key figures instantly

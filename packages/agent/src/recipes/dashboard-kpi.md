---
id: dashboard-kpi
name: Dashboard KPI
components_used: [stat-card, chart, table, kv]
when: donnees contenant des metriques, compteurs, totaux, ou statistiques agregees
layout:
  type: grid
  columns: 3
  arrangement: stat-cards en ligne, chart + table en dessous
---

## Quand utiliser
Les donnees MCP contiennent des metriques numeriques, des compteurs, des totaux, ou des statistiques agregees. Typique pour les dashboards de suivi.

## Comment
1. Identifier les 3-5 KPIs principaux dans les donnees
2. Afficher chaque KPI avec `component("stat-card", {label, value, trend?, icon?})`
3. Si des series temporelles existent, ajouter un `component("chart", {type: "bar"|"line", ...})`
4. Si des details tabulaires existent, ajouter un `component("table", {columns, rows})`
5. Pour les metadonnees, utiliser `component("kv", {pairs: [...]})`

## Exemple

API retourne des statistiques de ventes :
```json
{
  "total_revenue": 45230,
  "orders_count": 312,
  "avg_order": 145,
  "by_month": [{"month": "Jan", "revenue": 12000}, ...]
}
```

→ `component("stat-card", {label: "Chiffre d'affaires", value: "45 230 €"})`
→ `component("stat-card", {label: "Commandes", value: "312"})`
→ `component("stat-card", {label: "Panier moyen", value: "145 €"})`
→ `component("chart", {type: "bar", labels: months, datasets: [{label: "CA", data: revenues}]})`

## Regles
- Toujours formater les nombres (separateurs de milliers, unites)
- Preferer stat-card a stat pour les KPIs importants (stat-card a plus de place pour les details)
- Limiter a 5 stat-cards max — au-dela, utiliser kv ou table

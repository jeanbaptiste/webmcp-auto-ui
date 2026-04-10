---
id: composer-tableau-de-bord-kpi-depuis-metriques-agregees
name: Composer un tableau de bord KPI a partir de metriques agregees
components_used: [stat-card, chart, table, kv]
when: les donnees MCP contiennent des metriques numeriques, compteurs, totaux, pourcentages ou statistiques agregees qui meritent un tableau de bord visuel
servers: []
layout:
  type: grid
  columns: 3
  arrangement: stat-cards en ligne, chart + table en dessous
---

## Quand utiliser

Les resultats MCP contiennent des metriques numeriques qu'il faut presenter de facon synthetique. Cette recette est transversale : elle s'applique quel que soit le serveur MCP, des lors que les donnees contiennent :
- Des totaux, compteurs ou moyennes (revenus, nombre d'articles, participation, etc.)
- Des pourcentages ou ratios (taux de churn, participation electorale, etc.)
- Des series temporelles de metriques (evolution mois par mois, trimestre par trimestre)
- Des ventilations par categorie (par groupe politique, par pays, par type d'objet)

## Comment

1. **Identifier les 3-5 KPIs principaux** dans les donnees retournees par le serveur MCP
2. **Afficher chaque KPI en stat-card** avec formatage soigne :
   ```
   component("stat-card", {label: "Chiffre d'affaires", value: "45 230 EUR", trend: "+12.4%", trendDir: "up", icon: "trending-up"})
   ```
   - Toujours formater les nombres : separateurs de milliers, unites, symboles
   - Ajouter `trend` et `trendDir` si une comparaison est disponible (vs mois precedent, vs annee precedente)
3. **Si des series temporelles existent**, ajouter un graphique :
   ```
   component("chart", {type: "bar", labels: ["Q1", "Q2", "Q3", "Q4"], datasets: [{label: "CA", data: [98000, 112000, 128000, 142000]}]})
   ```
   - "bar" pour des comparaisons entre categories/periodes
   - "line" pour des evolutions continues
4. **Si des details tabulaires existent**, ajouter une table :
   ```
   component("table", {columns: ["Categorie", "Valeur", "Evolution"], rows: [...]})
   ```
5. **Pour les metadonnees complementaires**, utiliser kv :
   ```
   component("kv", {pairs: [["Source", "data.gouv.fr"], ["Derniere mise a jour", "2026-04-01"], ["Periode", "T1 2026"]]})
   ```

## Exemples

### Dashboard parlementaire (Tricoteuses)
```
// Apres query_sql sur les scrutins de la legislature
component("stat-card", {label: "Scrutins publics", value: "1 247", icon: "vote"})
component("stat-card", {label: "Amendements deposes", value: "42 831", icon: "file-text"})
component("stat-card", {label: "Participation moyenne", value: "61.3%", trend: "-2.1%", trendDir: "down"})
component("chart", {type: "bar", labels: mois, datasets: [{label: "Scrutins/mois", data: counts}]})
component("table", {columns: ["Groupe", "Amendements", "Adoptes", "Taux"], rows: groupStats})
```

### Dashboard biodiversite (iNaturalist)
```
component("stat-card", {label: "Observations", value: "3 412", icon: "eye"})
component("stat-card", {label: "Especes uniques", value: "287", icon: "leaf"})
component("stat-card", {label: "Observateurs", value: "156", icon: "users"})
component("chart", {type: "line", labels: dates, datasets: [{label: "Observations/jour", data: dailyCounts}]})
```

### Dashboard actualites (Hacker News)
```
component("stat-card", {label: "Top stories", value: "500", icon: "newspaper"})
component("stat-card", {label: "Score moyen", value: "142", icon: "trending-up"})
component("stat-card", {label: "Commentaires moyen", value: "87", icon: "message-circle"})
component("table", {columns: ["Rang", "Titre", "Score", "Commentaires"], rows: topStories})
```

## Erreurs courantes

- **Trop de stat-cards** : au-dela de 5, basculer vers un `kv` ou un `table` pour les metriques secondaires
- **Nombres non formates** : afficher "45230" au lieu de "45 230" nuit a la lisibilite
- **Oublier les unites** : "45 230" ne signifie rien sans "EUR", "%", "observations", etc.
- **Graphique sans contexte** : toujours accompagner un graphique de stat-cards qui donnent les chiffres cles instantanement

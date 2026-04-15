---
id: explore-legislative-files-text-journey
name: Explore legislative files and the journey of a text between the Assembly and the Senate
components_used: [timeline, table, kv, stat-card]
when: the user asks about the journey of a bill or legislative proposal, the parliamentary shuttle, successive readings, or the tracking of a legislative file
servers: [tricoteuses]
layout:
  type: grid
  columns: 2
  arrangement: full-width timeline at top, stats + table below
---

## When to use

The user is interested in the journey of a bill through the institutions:
- "Where does the immigration bill currently stand?"
- "Show me the parliamentary shuttle for the pension reform"
- "How many readings did this text go through?"
- "Which amendments were adopted in committee?"

The Tricoteuses server contains legislative files with their stages: filing, referral to committee, floor debate, vote, shuttle, promulgation.

## How to use

1. **Search for the legislative file**:
   ```
   query_sql({sql: "SELECT * FROM assemblee.dossiers WHERE titre ILIKE '%immigration%' ORDER BY date_depot DESC LIMIT 5"})
   ```
   Or via Tricoteuses recipes:
   ```
   search_recipes({query: "dossier legislatif parcours"})
   ```

2. **Retrieve the journey stages**:
   ```
   query_sql({sql: "SELECT etape, chambre, date, resultat FROM assemblee.dossier_etapes WHERE dossier_id = $id ORDER BY date"})
   ```

3. **Display the journey timeline**:
   ```
   component("timeline", {
     events: etapes.map(e => ({
       date: e.date,
       title: e.etape + " — " + e.chambre,
       description: e.resultat,
       status: e.resultat === "Adopte" ? "success" : e.resultat === "Rejete" ? "error" : "pending"
     }))
   })
   ```

4. **File statistics** in stat-cards:
   ```
   component("stat-card", {label: "Readings", value: "3", icon: "book-open"})
   component("stat-card", {label: "Amendments filed", value: "1 247", icon: "file-text"})
   component("stat-card", {label: "Amendments adopted", value: "312", icon: "check"})
   component("stat-card", {label: "Total duration", value: "14 months", icon: "clock"})
   ```

5. **Amendment details by stage** in a table:
   ```
   component("table", {
     columns: ["Stage", "Chamber", "Amendments filed", "Adopted", "Rejected"],
     rows: etapeStats
   })
   ```

6. **File metadata** in kv:
   ```
   component("kv", {pairs: [
     ["Title", dossier.titre],
     ["Nature", "Projet de loi"],
     ["Author", "Gouvernement"],
     ["Filing date", dossier.date_depot],
     ["Current status", dossier.etat],
     ["Source", "Tricoteuses"]
   ]})
   ```

## Examples

### Complete text journey
```
// 1. Retrieve the file
query_sql({sql: "SELECT id, titre, date_depot, etat FROM assemblee.dossiers WHERE titre ILIKE '%retraites%2023%' LIMIT 1"})

// 2. Stages
query_sql({sql: "SELECT * FROM assemblee.dossier_etapes WHERE dossier_id = $id ORDER BY date"})

// 3. Amendments by stage
query_sql({sql: "SELECT etape, COUNT(*) as total, COUNT(*) FILTER (WHERE sort='Adopte') as adoptes FROM assemblee.amendements WHERE dossier_id = $id GROUP BY etape"})

// 4. Render
component("kv", {pairs: [["File", titre], ["Status", etat]]})
component("timeline", {events: etapes})
component("stat-card", {label: "Total amendments", value: totalAmendements})
component("stat-card", {label: "Adopted", value: totalAdoptes})
component("table", {columns: ["Stage", "Filed", "Adopted", "Rate"], rows: etapeStats})
```

### Comparison between chambers
```
// Amendments by chamber
query_sql({sql: "SELECT chambre, COUNT(*) as deposes, COUNT(*) FILTER (WHERE sort='Adopte') as adoptes FROM assemblee.amendements WHERE dossier_id = $id GROUP BY chambre"})

component("stat-card", {label: "Assembly — Adopted", value: an_adoptes + "/" + an_deposes})
component("stat-card", {label: "Senate — Adopted", value: senat_adoptes + "/" + senat_deposes})
component("chart", {type: "bar", labels: ["Assemblee", "Senat"], datasets: [{label: "Filed", data: [an_deposes, senat_deposes]}, {label: "Adopted", data: [an_adoptes, senat_adoptes]}]})
```

## Common mistakes

- **Confusing bill types**: a "projet de loi" comes from the government, a "proposition de loi" comes from a parliamentary member — check the `nature` field
- **Not following the shuttle**: a text can make several back-and-forth trips between the Assembly and the Senate — display ALL stages
- **Forgetting the CMP**: the Commission Mixte Paritaire (Joint Committee) is a crucial stage between the two chambers — do not omit it from the timeline
- **Non-chronological timeline**: always sort stages by ascending date

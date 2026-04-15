---
id: display-parliamentary-profile-with-hemicycle-and-votes
name: Display a parliamentary profile with hemicycle, votes and mandate timeline
components_used: [profile, hemicycle, timeline, table, stat-card, kv]
when: MCP data concerns a deputy, senator, parliamentary group, vote, or amendment from a parliamentary database
servers: [tricoteuses]
layout:
  type: grid
  columns: 2
  arrangement: profile + stats at top, hemicycle + timeline below
---

## When to use

MCP results come from the Tricoteuses server (French parliamentary database) and concern:
- A **deputy or senator**: individual profile, mandates, activity
- A **political group**: composition, votes, positioning
- **Public votes**: vote results, breakdown by group
- **Amendments**: text, author, outcome, targeted article
- **Legislative files**: text journey, parliamentary shuttle

This recipe is specific to the Tricoteuses server and its tools: `query_sql`, `search_recipes`, `list_tables`, `describe_table`.

## How to use

1. **Retrieve the parliamentary member's information** via the Tricoteuses tools:
   ```
   query_sql({sql: "SELECT * FROM acteurs WHERE nom ILIKE '%dupont%' AND type = 'depute'"})
   ```
   Or via Tricoteuses recipes:
   ```
   search_recipes({query: "profil depute"})
   get_recipe({name: "recipe-name"})
   ```

2. **Display the profile card**:
   ```
   component("profile", {
     name: "Jean Dupont",
     subtitle: "Depute du Rhone — 3e circonscription",
     photo: url_photo,
     details: ["Groupe: Renaissance", "Commission: Lois", "Depuis: 2022"]
   })
   ```

3. **Display activity statistics** in stat-cards:
   ```
   component("stat-card", {label: "Vote participation", value: "87%", trend: "+3%", trendDir: "up"})
   component("stat-card", {label: "Amendments filed", value: "42", icon: "file-text"})
   component("stat-card", {label: "Written questions", value: "18", icon: "help-circle"})
   component("stat-card", {label: "Hemicycle speeches", value: "7", icon: "mic"})
   ```

4. **If vote data by group is available**, display the hemicycle:
   ```
   component("hemicycle", {
     groups: [
       {name: "Renaissance", seats: 170, color: "#FFD700", vote: "pour"},
       {name: "LFI", seats: 75, color: "#CC0000", vote: "contre"},
       ...
     ],
     result: {pour: 312, contre: 245, abstention: 18}
   })
   ```

5. **For the mandate history or key votes**, use the timeline:
   ```
   component("timeline", {
     events: [
       {date: "2022-06-19", title: "Elected deputy", description: "3e circ. du Rhone"},
       {date: "2023-03-16", title: "Vote 49.3 pensions reform", description: "Motion de censure rejetee"},
       {date: "2024-07-07", title: "Re-elected deputy", description: "2nd round"}
     ]
   })
   ```

6. **For vote or amendment details**, use a table:
   ```
   component("table", {
     columns: ["Date", "Vote", "Position", "Result"],
     rows: votes.map(v => [v.date, v.intitule, v.position, v.resultat])
   })
   ```

7. **Complete with metadata** in kv:
   ```
   component("kv", {pairs: [
     ["Legislature", "XVIe (2022-2027)"],
     ["Group", "Renaissance"],
     ["Standing committee", "Lois"],
     ["Source", "Tricoteuses — mcp.code4code.eu"]
   ]})
   ```

## Examples

### Complete deputy profile
```
// 1. Look up the deputy
query_sql({sql: "SELECT * FROM acteurs WHERE nom ILIKE '%dupont%' LIMIT 1"})

// 2. Their amendments
query_sql({sql: "SELECT COUNT(*) as total, SUM(CASE WHEN sort='Adopte' THEN 1 ELSE 0 END) as adoptes FROM amendements WHERE auteur_id = $id"})

// 3. Their recent votes
query_sql({sql: "SELECT s.date, s.intitule, v.position FROM scrutins s JOIN votes v ON s.id = v.scrutin_id WHERE v.acteur_id = $id ORDER BY s.date DESC LIMIT 10"})

// 4. Full render
component("profile", {name, subtitle, photo})
component("stat-card", {label: "Amendments", value: total, icon: "file-text"})
component("stat-card", {label: "Adopted", value: adoptes, icon: "check"})
component("stat-card", {label: "Adoption rate", value: Math.round(adoptes/total*100) + "%"})
component("table", {columns: ["Date", "Vote", "Position"], rows: votes})
component("timeline", {events: mandats})
```

### Vote result with hemicycle
```
// 1. Retrieve the vote
query_sql({sql: "SELECT * FROM scrutins WHERE intitule ILIKE '%budget%' ORDER BY date DESC LIMIT 1"})

// 2. Breakdown by group
query_sql({sql: "SELECT g.nom, g.couleur, COUNT(*) FILTER (WHERE v.position='pour') as pour, COUNT(*) FILTER (WHERE v.position='contre') as contre FROM votes v JOIN groupes g ON v.groupe_id = g.id WHERE v.scrutin_id = $id GROUP BY g.nom, g.couleur"})

// 3. Render
component("stat-card", {label: "For", value: "312", trendDir: "up"})
component("stat-card", {label: "Against", value: "245", trendDir: "down"})
component("hemicycle", {groups: groupResults, result: {pour: 312, contre: 245, abstention: 18}})
component("table", {columns: ["Group", "For", "Against", "Abstention"], rows: groupDetails})
```

## Components specific to the parliamentary domain

- **hemicycle**: semicircular arc showing vote distribution by political group, with party colors
- **profile**: individual card with photo, name, role, structured details
- **timeline**: chronology of mandates, key votes, parliamentary events
- **trombinoscope**: photo grid for a group of parliamentary members (useful for committees)

## Common mistakes

- **Overly broad SQL queries**: always use LIMIT and precise filters to avoid overloading the server
- **Confusing actors and mandates**: a deputy can have multiple mandates in the database — filter by current legislature
- **Forgetting the source**: always credit "Tricoteuses" as the source in a final kv
- **Hemicycle without context**: always accompany the hemicycle component with stat-cards showing for/against/abstention totals

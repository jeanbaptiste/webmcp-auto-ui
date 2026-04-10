---
id: afficher-profil-parlementaire-avec-hemicycle-et-votes
name: Afficher le profil d'un parlementaire avec hemicycle, votes et timeline des mandats
components_used: [profile, hemicycle, timeline, table, stat-card, kv]
when: les donnees MCP concernent un depute, senateur, groupe parlementaire, scrutin ou amendement provenant d'une base de donnees parlementaire
servers: [tricoteuses]
layout:
  type: grid
  columns: 2
  arrangement: profile + stats en haut, hemicycle + timeline en bas
---

## Quand utiliser

Les resultats MCP proviennent du serveur Tricoteuses (base de donnees parlementaire francaise) et concernent :
- Un **depute ou senateur** : fiche individuelle, mandats, activite
- Un **groupe politique** : composition, votes, positionnement
- Des **scrutins publics** : resultats de vote, repartition par groupe
- Des **amendements** : texte, auteur, sort, article vise
- Des **dossiers legislatifs** : parcours d'un texte, navette parlementaire

La recette est specifique au serveur Tricoteuses et a ses outils : `query_sql`, `search_recipes`, `list_tables`, `describe_table`.

## Comment

1. **Recuperer les informations du parlementaire** via les outils Tricoteuses :
   ```
   query_sql({sql: "SELECT * FROM acteurs WHERE nom ILIKE '%dupont%' AND type = 'depute'"})
   ```
   Ou via les recipes Tricoteuses :
   ```
   search_recipes({query: "profil depute"})
   get_recipe({name: "recipe-name"})
   ```

2. **Afficher la fiche profil** :
   ```
   component("profile", {
     name: "Jean Dupont",
     subtitle: "Depute du Rhone — 3e circonscription",
     photo: url_photo,
     details: ["Groupe: Renaissance", "Commission: Lois", "Depuis: 2022"]
   })
   ```

3. **Afficher les statistiques d'activite** en stat-cards :
   ```
   component("stat-card", {label: "Participation aux scrutins", value: "87%", trend: "+3%", trendDir: "up"})
   component("stat-card", {label: "Amendements deposes", value: "42", icon: "file-text"})
   component("stat-card", {label: "Questions ecrites", value: "18", icon: "help-circle"})
   component("stat-card", {label: "Interventions hemicycle", value: "7", icon: "mic"})
   ```

4. **Si des donnees de vote par groupe sont disponibles**, afficher l'hemicycle :
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

5. **Pour l'historique des mandats ou votes cles**, utiliser la timeline :
   ```
   component("timeline", {
     events: [
       {date: "2022-06-19", title: "Elu depute", description: "3e circ. du Rhone"},
       {date: "2023-03-16", title: "Vote 49.3 retraites", description: "Motion de censure rejetee"},
       {date: "2024-07-07", title: "Reelu depute", description: "2e tour"}
     ]
   })
   ```

6. **Pour les details des votes ou amendements**, utiliser une table :
   ```
   component("table", {
     columns: ["Date", "Scrutin", "Vote", "Resultat"],
     rows: votes.map(v => [v.date, v.intitule, v.position, v.resultat])
   })
   ```

7. **Completer avec les metadonnees** en kv :
   ```
   component("kv", {pairs: [
     ["Legislature", "XVIe (2022-2027)"],
     ["Groupe", "Renaissance"],
     ["Commission permanente", "Lois"],
     ["Source", "Tricoteuses — mcp.code4code.eu"]
   ]})
   ```

## Exemples

### Profil complet d'un depute
```
// 1. Chercher le depute
query_sql({sql: "SELECT * FROM acteurs WHERE nom ILIKE '%dupont%' LIMIT 1"})

// 2. Ses amendements
query_sql({sql: "SELECT COUNT(*) as total, SUM(CASE WHEN sort='Adopte' THEN 1 ELSE 0 END) as adoptes FROM amendements WHERE auteur_id = $id"})

// 3. Ses votes recents
query_sql({sql: "SELECT s.date, s.intitule, v.position FROM scrutins s JOIN votes v ON s.id = v.scrutin_id WHERE v.acteur_id = $id ORDER BY s.date DESC LIMIT 10"})

// 4. Rendu complet
component("profile", {name, subtitle, photo})
component("stat-card", {label: "Amendements", value: total, icon: "file-text"})
component("stat-card", {label: "Adoptes", value: adoptes, icon: "check"})
component("stat-card", {label: "Taux d'adoption", value: Math.round(adoptes/total*100) + "%"})
component("table", {columns: ["Date", "Scrutin", "Position"], rows: votes})
component("timeline", {events: mandats})
```

### Resultat d'un scrutin avec hemicycle
```
// 1. Recuperer le scrutin
query_sql({sql: "SELECT * FROM scrutins WHERE intitule ILIKE '%budget%' ORDER BY date DESC LIMIT 1"})

// 2. Repartition par groupe
query_sql({sql: "SELECT g.nom, g.couleur, COUNT(*) FILTER (WHERE v.position='pour') as pour, COUNT(*) FILTER (WHERE v.position='contre') as contre FROM votes v JOIN groupes g ON v.groupe_id = g.id WHERE v.scrutin_id = $id GROUP BY g.nom, g.couleur"})

// 3. Rendu
component("stat-card", {label: "Pour", value: "312", trendDir: "up"})
component("stat-card", {label: "Contre", value: "245", trendDir: "down"})
component("hemicycle", {groups: groupResults, result: {pour: 312, contre: 245, abstention: 18}})
component("table", {columns: ["Groupe", "Pour", "Contre", "Abstention"], rows: groupDetails})
```

## Composants specifiques au domaine parlementaire

- **hemicycle** : arc de cercle montrant la repartition des votes par groupe politique, avec couleurs par parti
- **profile** : fiche individuelle avec photo, nom, fonction, details structurees
- **timeline** : chronologie des mandats, votes cles, evenements parlementaires
- **trombinoscope** : grille de photos pour un groupe de parlementaires (utile pour les commissions)

## Erreurs courantes

- **Requetes SQL trop larges** : toujours utiliser LIMIT et des filtres precis pour eviter de surcharger le serveur
- **Confondre acteurs et mandats** : un depute peut avoir plusieurs mandats dans la base, filtrer par legislature courante
- **Oublier la source** : toujours crediter "Tricoteuses" comme source dans un kv final
- **Hemicycle sans contexte** : toujours accompagner le composant hemicycle de stat-cards avec les totaux pour/contre/abstention

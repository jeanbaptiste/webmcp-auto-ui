---
id: explorer-dossiers-legislatifs-parcours-texte
name: Explorer les dossiers legislatifs et le parcours d'un texte entre Assemblee et Senat
components_used: [timeline, table, kv, stat-card]
when: l'utilisateur demande le parcours d'un projet ou proposition de loi, la navette parlementaire, les lectures successives, ou le suivi d'un dossier legislatif
servers: [tricoteuses]
layout:
  type: grid
  columns: 2
  arrangement: timeline pleine largeur en haut, stats + table en dessous
---

## Quand utiliser

L'utilisateur s'interesse au parcours d'un texte de loi a travers les institutions :
- "Ou en est le projet de loi sur l'immigration ?"
- "Montre-moi la navette parlementaire de la reforme des retraites"
- "Combien de lectures a subi ce texte ?"
- "Quels amendements ont ete adoptes en commission ?"

Le serveur Tricoteuses contient les dossiers legislatifs avec leurs etapes : depot, renvoi en commission, discussion en seance, vote, navette, promulgation.

## Comment

1. **Rechercher le dossier legislatif** :
   ```
   query_sql({sql: "SELECT * FROM assemblee.dossiers WHERE titre ILIKE '%immigration%' ORDER BY date_depot DESC LIMIT 5"})
   ```
   Ou via les recettes Tricoteuses :
   ```
   search_recipes({query: "dossier legislatif parcours"})
   ```

2. **Recuperer les etapes du parcours** :
   ```
   query_sql({sql: "SELECT etape, chambre, date, resultat FROM assemblee.dossier_etapes WHERE dossier_id = $id ORDER BY date"})
   ```

3. **Afficher la timeline du parcours** :
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

4. **Statistiques du dossier** en stat-cards :
   ```
   component("stat-card", {label: "Lectures", value: "3", icon: "book-open"})
   component("stat-card", {label: "Amendements deposes", value: "1 247", icon: "file-text"})
   component("stat-card", {label: "Amendements adoptes", value: "312", icon: "check"})
   component("stat-card", {label: "Duree totale", value: "14 mois", icon: "clock"})
   ```

5. **Details des amendements par etape** en table :
   ```
   component("table", {
     columns: ["Etape", "Chambre", "Amendements deposes", "Adoptes", "Rejetes"],
     rows: etapeStats
   })
   ```

6. **Metadonnees du dossier** en kv :
   ```
   component("kv", {pairs: [
     ["Titre", dossier.titre],
     ["Nature", "Projet de loi"],
     ["Auteur", "Gouvernement"],
     ["Date de depot", dossier.date_depot],
     ["Etat actuel", dossier.etat],
     ["Source", "Tricoteuses"]
   ]})
   ```

## Exemples

### Parcours complet d'un texte
```
// 1. Recuperer le dossier
query_sql({sql: "SELECT id, titre, date_depot, etat FROM assemblee.dossiers WHERE titre ILIKE '%retraites%2023%' LIMIT 1"})

// 2. Etapes
query_sql({sql: "SELECT * FROM assemblee.dossier_etapes WHERE dossier_id = $id ORDER BY date"})

// 3. Amendements par etape
query_sql({sql: "SELECT etape, COUNT(*) as total, COUNT(*) FILTER (WHERE sort='Adopte') as adoptes FROM assemblee.amendements WHERE dossier_id = $id GROUP BY etape"})

// 4. Rendu
component("kv", {pairs: [["Dossier", titre], ["Etat", etat]]})
component("timeline", {events: etapes})
component("stat-card", {label: "Total amendements", value: totalAmendements})
component("stat-card", {label: "Adoptes", value: totalAdoptes})
component("table", {columns: ["Etape", "Deposes", "Adoptes", "Taux"], rows: etapeStats})
```

### Comparaison entre chambres
```
// Amendements par chambre
query_sql({sql: "SELECT chambre, COUNT(*) as deposes, COUNT(*) FILTER (WHERE sort='Adopte') as adoptes FROM assemblee.amendements WHERE dossier_id = $id GROUP BY chambre"})

component("stat-card", {label: "Assemblee — Adoptes", value: an_adoptes + "/" + an_deposes})
component("stat-card", {label: "Senat — Adoptes", value: senat_adoptes + "/" + senat_deposes})
component("chart", {type: "bar", labels: ["Assemblee", "Senat"], datasets: [{label: "Deposes", data: [an_deposes, senat_deposes]}, {label: "Adoptes", data: [an_adoptes, senat_adoptes]}]})
```

## Erreurs courantes

- **Confondre projet et proposition de loi** : un projet vient du gouvernement, une proposition vient d'un parlementaire — verifier le champ `nature`
- **Ne pas suivre la navette** : un texte peut faire plusieurs allers-retours entre Assemblee et Senat — afficher TOUTES les etapes
- **Oublier la CMP** : la Commission Mixte Paritaire est une etape cruciale entre les deux chambres, ne pas l'omettre dans la timeline
- **Timeline non chronologique** : toujours trier les etapes par date croissante

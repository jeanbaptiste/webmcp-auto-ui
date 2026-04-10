---
id: rechercher-textes-juridiques-legifrance
name: Rechercher des textes juridiques, codes et lois via les donnees Legifrance
components_used: [table, text, kv, code]
when: l'utilisateur demande des informations sur des lois, codes juridiques, articles de loi, decrets, ordonnances ou textes legislatifs francais disponibles dans la base Tricoteuses
servers: [tricoteuses]
layout:
  type: grid
  columns: 1
---

## Quand utiliser

L'utilisateur pose une question sur le droit francais, la legislation, ou un texte juridique specifique :
- "Que dit l'article 49-3 de la Constitution ?"
- "Quels decrets ont ete publies sur le droit du travail en 2025 ?"
- "Montre-moi les articles du Code civil sur la filiation"
- "Quelles lois ont ete promulguees ce mois-ci ?"

La base Tricoteuses contient des donnees issues de Legifrance (textes consolides, codes, lois, decrets). Utiliser `list_tables` pour decouvrir les tables disponibles dans le schema legifrance, puis `describe_table` et `query_sql` pour extraire les textes.

## Comment

1. **Decouvrir les tables disponibles** :
   ```
   list_tables({schema: "legifrance"})
   ```
   Tables typiques : `textes_versions`, `articles`, `codes`, `sections`

2. **Decrire la structure** d'une table pour comprendre les colonnes :
   ```
   describe_table({schema: "legifrance", table: "articles"})
   ```

3. **Rechercher les textes** avec des requetes SQL :
   ```
   query_sql({sql: "SELECT titre, date_publi, nature FROM legifrance.textes_versions WHERE titre ILIKE '%travail%' ORDER BY date_publi DESC LIMIT 20"})
   ```

4. **Afficher les resultats** :
   - **Table** pour les listes de textes :
     ```
     component("table", {columns: ["Titre", "Nature", "Date", "Etat"], rows: textes})
     ```
   - **Text** pour le contenu d'un article :
     ```
     component("text", {content: "### Article 49-3 de la Constitution\n\n" + article.contenu})
     ```
   - **Code** pour les extraits legislatifs avec mise en forme :
     ```
     component("code", {language: "text", content: article.texte_integral})
     ```
   - **KV** pour les metadonnees du texte :
     ```
     component("kv", {pairs: [["Nature", "Loi organique"], ["Date", "2023-04-14"], ["NOR", "JUSX2300001L"], ["Etat", "En vigueur"]]})
     ```

## Exemples

### Articles d'un code juridique
```
// 1. Trouver les articles du Code civil sur la filiation
query_sql({sql: "SELECT num_article, contenu, etat FROM legifrance.articles WHERE code = 'Code civil' AND section ILIKE '%filiation%' ORDER BY num_article"})

// 2. Rendu
component("kv", {pairs: [["Code", "Code civil"], ["Section", "De la filiation"], ["Articles trouves", results.length]]})
component("table", {columns: ["Article", "Contenu (extrait)", "Etat"], rows: results.map(r => [r.num_article, r.contenu.slice(0, 200) + "...", r.etat])})
```

### Textes recents par nature
```
// 1. Lois promulguees en 2026
query_sql({sql: "SELECT titre, date_publi, nor FROM legifrance.textes_versions WHERE nature = 'LOI' AND date_publi >= '2026-01-01' ORDER BY date_publi DESC"})

// 2. Rendu
component("stat-card", {label: "Lois promulguees en 2026", value: results.length, icon: "scale"})
component("table", {columns: ["Titre", "Date", "NOR"], rows: results})
```

## Erreurs courantes

- **Confondre les schemas** : les donnees Legifrance sont dans le schema `legifrance`, pas dans `assemblee` — verifier avec `list_tables`
- **Requetes trop larges** : toujours utiliser LIMIT et des filtres WHERE precis
- **Afficher le texte integral brut** : utiliser le composant `text` avec formatage Markdown plutot que de dumper le JSON
- **Oublier de preciser l'etat du texte** : un article peut etre abroge, modifie ou en vigueur — toujours l'indiquer

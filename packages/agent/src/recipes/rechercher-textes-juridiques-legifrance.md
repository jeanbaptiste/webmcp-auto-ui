---
id: search-legal-texts-legifrance
name: Search legal texts, codes and laws via Legifrance data
components_used: [table, text, kv, code]
when: the user asks for information about French laws, legal codes, articles of law, decrees, ordinances or legislative texts available in the Tricoteuses database
servers: [tricoteuses]
layout:
  type: grid
  columns: 1
---

## When to use

The user asks a question about French law, legislation, or a specific legal text:
- "What does article 49-3 of the Constitution say?"
- "Which decrees were published on labour law in 2025?"
- "Show me the articles of the Civil Code on filiation"
- "Which laws were enacted this month?"

The Tricoteuses database contains data from Legifrance (consolidated texts, codes, laws, decrees). Use `list_tables` to discover the available tables in the legifrance schema, then `describe_table` and `query_sql` to extract the texts.

## How to use

1. **Discover available tables**:
   ```
   list_tables({schema: "legifrance"})
   ```
   Typical tables: `textes_versions`, `articles`, `codes`, `sections`

2. **Describe the structure** of a table to understand the columns:
   ```
   describe_table({schema: "legifrance", table: "articles"})
   ```

3. **Search for texts** with SQL queries:
   ```
   query_sql({sql: "SELECT titre, date_publi, nature FROM legifrance.textes_versions WHERE titre ILIKE '%travail%' ORDER BY date_publi DESC LIMIT 20"})
   ```

4. **Display results**:
   - **Table** for lists of texts:
     ```
     component("table", {columns: ["Title", "Nature", "Date", "Status"], rows: textes})
     ```
   - **Text** for the content of an article:
     ```
     component("text", {content: "### Article 49-3 de la Constitution\n\n" + article.contenu})
     ```
   - **Code** for legislative excerpts with formatting:
     ```
     component("code", {language: "text", content: article.texte_integral})
     ```
   - **KV** for text metadata:
     ```
     component("kv", {pairs: [["Nature", "Loi organique"], ["Date", "2023-04-14"], ["NOR", "JUSX2300001L"], ["Status", "En vigueur"]]})
     ```

## Examples

### Articles from a legal code
```
// 1. Find articles of the Civil Code on filiation
query_sql({sql: "SELECT num_article, contenu, etat FROM legifrance.articles WHERE code = 'Code civil' AND section ILIKE '%filiation%' ORDER BY num_article"})

// 2. Render
component("kv", {pairs: [["Code", "Code civil"], ["Section", "De la filiation"], ["Articles found", results.length]]})
component("table", {columns: ["Article", "Content (excerpt)", "Status"], rows: results.map(r => [r.num_article, r.contenu.slice(0, 200) + "...", r.etat])})
```

### Recent texts by nature
```
// 1. Laws enacted in 2026
query_sql({sql: "SELECT titre, date_publi, nor FROM legifrance.textes_versions WHERE nature = 'LOI' AND date_publi >= '2026-01-01' ORDER BY date_publi DESC"})

// 2. Render
component("stat-card", {label: "Laws enacted in 2026", value: results.length, icon: "scale"})
component("table", {columns: ["Title", "Date", "NOR"], rows: results})
```

## Common mistakes

- **Confusing schemas**: Legifrance data is in the `legifrance` schema, not in `assemblee` — verify with `list_tables`
- **Overly broad queries**: always use LIMIT and precise WHERE filters
- **Displaying raw full text**: use the `text` component with Markdown formatting rather than dumping the JSON
- **Forgetting to specify the text status**: an article can be repealed, amended or in force — always indicate it

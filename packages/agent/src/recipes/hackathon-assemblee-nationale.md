---
id: hackathon-assemblee-nationale-mcp-webmcp
name: Hackathon Assemblée Nationale · MCP & WebMCP starter
components_used: [notebook]
when: the user mentions the Assemblée Nationale hackathon, wants to experiment with parliamentary data (Tricoteuses, Legifrance), or asks for a starter notebook to explore deputies, votes, amendments, or legislative texts in a hackathon context. Keywords include "hackathon Assemblée Nationale", "MCP WebMCP hackathon", "tricoteuses playbook", "parlement playground", "hackathon parlementaire".
servers: [autoui, tricoteuses]
layout:
  type: single
---

## When to use

The user is participating in (or preparing for) the Assemblée Nationale hackathon around MCP and WebMCP. They want a ready-to-fork notebook with:
- A clear onboarding (what the hackathon is about, what data is available)
- Seed queries against Tricoteuses (parliamentary database) that return meaningful results immediately
- A visualization or transformation cell that the participant can iterate on
- A closing "your turn" note inviting them to modify, run, and share

This recipe is a **specialization** of the generic `notebook-playbook` recipe — pre-filled with parliamentary-specific seed cells and tailored to the hackathon narrative.

## How to use

### Step 1 — Use the `notebook` widget

The single `notebook` widget fits the hackathon brief: prose, SQL and JS share one drag-and-droppable flow, suited both to a "brief + starter code" read and to free exploration.

### Step 2 — Seed the cells

The notebook should contain 5–7 cells covering:

1. **Intro markdown** — title, one-line context of the hackathon, link to relevant docs
2. **Challenge markdown** — a few axes of exploration suggested by the hackathon organizers (replace placeholders with actual challenges when known)
3. **Starter SQL** — a safe, visibly meaningful query on Tricoteuses (e.g. recent votes, most active deputies, amendments on a specific text)
4. **Transform JS** — a small JS cell that post-processes the SQL result (grouping, counting, chart prep)
5. **Visualization hint** — a markdown cell pointing at available visualization widgets (`hemicycle`, `profile`, `timeline`)
6. **Your turn** — a closing markdown inviting the participant to fork and edit

Example template (to be refined with actual hackathon organizers' briefs):

```
widget_display({name: "notebook", params: {
  title: "Hackathon Assemblée Nationale · starter",
  cells: [
    {
      type: "md",
      content: "### Bienvenue au hackathon IA de l'Assemblée Nationale\n\nCe notebook est votre point de départ. Les données parlementaires proviennent du serveur <mark>Tricoteuses</mark>. Forkez, éditez, partagez."
    },
    {
      type: "md",
      content: "### Pistes d'exploration\n\n- Profil d'un parlementaire et son activité\n- Cartographie des votes par groupe politique\n- Amendements sur un texte précis\n- Enrichissement Wikipedia des parlementaires\n- Croisement entre circonscription et données externes"
    },
    {
      type: "sql",
      content: "-- 10 scrutins les plus récents\nSELECT id, date, intitule, pour, contre, abstention\nFROM scrutins\nORDER BY date DESC\nLIMIT 10",
      comment: {
        who: "organizers",
        when: "start",
        body: "Remplacez par une requête sur un texte qui vous intéresse (LIMIT important)."
      }
    },
    {
      type: "js",
      content: "// Regroupe les scrutins par mois\nconst byMonth = {};\nfor (const s of rows) {\n  const m = s.date.slice(0, 7);\n  byMonth[m] = (byMonth[m] || 0) + 1;\n}\nconsole.table(byMonth);"
    },
    {
      type: "md",
      content: "### Visualiser\n\nPour afficher un profil parlementaire : `widget_display({name: \"profile\", params: {...}})`.\nPour un hémicycle : `widget_display({name: \"hemicycle\", params: {groups, result}})`.\nPour une timeline de mandats : `widget_display({name: \"timeline\", params: {events}})`."
    },
    {
      type: "md",
      content: "### À vous\n\nAjoutez des cellules avec `+ sql / + code`, réarrangez, exécutez. Quand vous avez quelque chose d'intéressant, cliquez `share` pour partager le lien hyperskill avec votre équipe ou les organisateurs."
    }
  ]
}})
```

### Step 3 — Adapt to what the user knows

- If the user has no background in the Tricoteuses schema, mention they can use `list_tables` and `describe_table` on the Tricoteuses server to discover the data model before writing queries.
- If the user already has a specific question ("I want to look at votes on the 2024 budget"), rewrite the starter SQL to target that question directly.
- If the user asks for a minimal playground without the hackathon framing, fall back to the generic `notebook-playbook` recipe instead.

### Step 4 — Share

After creating the notebook, remind the user that they can:
- Use `share` → `Hyperskill link` to generate a fork-friendly URL to paste into their team's channel
- Switch to `view` mode when demoing to organizers
- Consult `⟲ history` to see their iteration trace and restore cells deleted by mistake

## Notes

This recipe is intended as a **starting skeleton** — the concrete hackathon brief (dates, prizes, specific challenges, dataset access restrictions) will be refined in a dedicated session with the organizers. Placeholders in the example above (axes of exploration, comments) should be replaced with the actual material provided by the hackathon team when it is available.

For parliamentary profile pages, vote results with hemicycles, and legislative file browsing, prefer the dedicated recipes:
- `display-parliamentary-profile-with-hemicycle-and-votes`
- `explorer-dossiers-legislatifs-parcours-texte`
- `rechercher-textes-juridiques-legifrance`

These recipes produce more specialized layouts than a generic notebook, and are better suited when the output is a single focused page rather than a multi-cell playbook.

## Common mistakes

- **Forgetting the hackathon framing**: without the "bienvenue" and "à vous" markdown cells, participants land on a bare notebook and lose the playbook feeling.
- **SQL without LIMIT**: Tricoteuses queries without `LIMIT` can return thousands of rows and slow down the first impression.
- **Inventing data**: do not seed with fake French parliamentary content (fake deputies, fake votes). If the actual data is not known at seed time, use generic queries (`SELECT * FROM scrutins LIMIT 5`) and let the user discover from there.

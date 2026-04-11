---
widget: data-table
description: Tableau de données triable avec colonnes configurables
group: rich
schema:
  type: object
  required:
    - rows
  properties:
    title:
      type: string
    columns:
      type: array
      items:
        type: object
        required:
          - key
          - label
        properties:
          key:
            type: string
          label:
            type: string
          align:
            type: string
            enum:
              - left
              - center
              - right
    rows:
      type: array
      items:
        type: object
---

## Quand utiliser
Pour afficher des données tabulaires avec plusieurs colonnes — résultats de requêtes, listes d'enregistrements, inventaires. Préférer `kv` pour une seule entité, `list` pour une seule colonne.

## Comment
1. Récupérer les données via MCP (ex: résultat SQL, liste d'objets)
2. Optionnel : définir `columns` pour contrôler l'ordre et les labels des colonnes
3. Appeler `autoui_webmcp_widget_display('data-table', { title: 'Utilisateurs', columns: [{ key: 'name', label: 'Nom' }, { key: 'email', label: 'Email' }], rows: [{ name: 'Alice', email: 'alice@ex.com' }] })`

## Erreurs courantes
- Oublier que `rows` est un tableau d'objets (pas un tableau de tableaux)
- Définir des `columns.key` qui ne correspondent pas aux clés des objets dans `rows`

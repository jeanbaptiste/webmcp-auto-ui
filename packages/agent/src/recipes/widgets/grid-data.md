---
widget: grid-data
description: Grille de données avec mise en surbrillance de cellules
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
          width:
            type: string
    rows:
      type: array
      items:
        type: array
    highlights:
      type: array
      items:
        type: object
        required:
          - row
          - col
        properties:
          row:
            type: number
          col:
            type: number
          color:
            type: string
---

## Quand utiliser
Pour afficher des données en grille avec la possibilité de mettre en surbrillance des cellules spécifiques — tableaux de bord, matrices de comparaison, heatmaps tabulaires. Préférer `data-table` pour un tableau triable classique.

## Comment
1. Récupérer les données via MCP
2. Structurer en lignes (tableaux) avec colonnes optionnelles
3. Ajouter des `highlights` pour attirer l'attention sur certaines cellules
4. Appeler `autoui_webmcp_widget_display('grid-data', { title: 'Matrice de risques', columns: [{ key: 'zone', label: 'Zone' }, { key: 'score', label: 'Score' }], rows: [['Nord', 85], ['Sud', 42]], highlights: [{ row: 0, col: 1, color: '#f44336' }] })`

## Erreurs courantes
- Les index `row` et `col` dans `highlights` sont 0-based
- `rows` est un tableau de tableaux (pas d'objets), contrairement à `data-table`

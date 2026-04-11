---
widget: canvas2d-heatmap
description: Grille colorée haute performance (valeur → couleur bleu froid → rouge chaud)
group: canvas2d
schema:
  type: object
  required:
    - values
  properties:
    title:
      type: string
      description: Titre optionnel affiché en haut
    values:
      type: array
      description: Matrice 2D de nombres (lignes × colonnes)
      items:
        type: array
        items:
          type: number
    xLabels:
      type: array
      description: Labels des colonnes
      items:
        type: string
    yLabels:
      type: array
      description: Labels des lignes
      items:
        type: string
---

## Quand utiliser
Pour afficher une grille de valeurs numériques avec un code couleur. Idéal pour : matrices de corrélation, cartes de chaleur temporelles, données tabulaires denses. Gère 100×100+ cellules sans problème grâce au Canvas 2D natif.

## Comment
1. Récupérer une matrice de données via MCP
2. Appeler avec `values` (array 2D) + optionnellement `xLabels` et `yLabels`

```
widget_display('canvas2d-heatmap', {
  title: 'Corrélation',
  values: [[1, 0.8, 0.2], [0.8, 1, 0.5], [0.2, 0.5, 1]],
  xLabels: ['A', 'B', 'C'],
  yLabels: ['A', 'B', 'C']
})
```

## Erreurs courantes
- `values` doit être un tableau de tableaux de nombres, pas un tableau plat
- Toutes les lignes doivent avoir la même longueur

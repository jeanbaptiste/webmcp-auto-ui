---
widget: canvas2d-scatter
description: Nuage de points 2D haute performance (10K+ points)
group: canvas2d
schema:
  type: object
  required:
    - points
  properties:
    title:
      type: string
    points:
      type: array
      description: Tableau de points {x, y, size?, category?, label?}
      items:
        type: object
        required:
          - x
          - y
        properties:
          x:
            type: number
          y:
            type: number
          size:
            type: number
            description: Rayon du point (1.5 à 8, défaut 3)
          category:
            type: string
            description: Catégorie pour la couleur
          label:
            type: string
            description: Label affiché au hover
    xLabel:
      type: string
      description: Label de l'axe X
    yLabel:
      type: string
      description: Label de l'axe Y
---

## Quand utiliser
Pour visualiser la distribution et les clusters dans des données bivariées. Optimisé Canvas 2D pour gérer 10 000+ points sans lag. Couleur automatique par catégorie.

## Comment
```
widget_display('canvas2d-scatter', {
  title: 'Iris dataset',
  points: [
    { x: 5.1, y: 3.5, category: 'setosa' },
    { x: 7.0, y: 3.2, category: 'versicolor' },
    { x: 6.3, y: 3.3, category: 'virginica' }
  ],
  xLabel: 'Sepal length',
  yLabel: 'Sepal width'
})
```

## Erreurs courantes
- Oublier `x` ou `y` dans un point — les deux sont required
- Passer `size` trop grand (>8) — sera clampé à 8

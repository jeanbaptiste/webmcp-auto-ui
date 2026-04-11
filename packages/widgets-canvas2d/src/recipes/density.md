---
widget: canvas2d-density
description: Courbe de densité (kernel density estimation) avec remplissage
group: canvas2d
schema:
  type: object
  required:
    - values
  properties:
    title:
      type: string
    values:
      type: array
      description: Tableau de valeurs numériques
      items:
        type: number
    color:
      type: string
      description: Couleur de la courbe (défaut bleu)
    bandwidth:
      type: number
      description: Bandwidth du kernel gaussien (0 = auto Silverman)
---

## Quand utiliser
Pour visualiser la distribution d'une variable continue. Plus lisible qu'un histogramme pour des données denses. Utilise un kernel gaussien avec bandwidth automatique (règle de Silverman).

## Comment
```
widget_display('canvas2d-density', {
  title: 'Distribution des scores',
  values: [72, 85, 90, 65, 78, 92, 88, 76, 81, 95, 70, 83]
})
```

Avec bandwidth custom :
```
widget_display('canvas2d-density', {
  values: [1.2, 1.5, 2.0, 2.3, 3.1, 3.5, 4.0],
  bandwidth: 0.5,
  color: '#59a14f'
})
```

## Erreurs courantes
- Passer moins de 2 valeurs — la KDE a besoin d'au moins quelques points
- `bandwidth` trop petit rend la courbe très bruitée, trop grand l'aplatit

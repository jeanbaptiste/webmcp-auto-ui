---
widget: canvas2d-sparklines
description: Mini-graphe inline sans axes — juste la courbe
group: canvas2d
schema:
  type: object
  required:
    - values
  properties:
    values:
      type: array
      description: Tableau de nombres à tracer
      items:
        type: number
    color:
      type: string
      description: Couleur CSS de la ligne (défaut bleu)
    filled:
      type: boolean
      description: Remplir sous la courbe (défaut true)
---

## Quand utiliser
Pour un aperçu compact d'une série temporelle ou d'une tendance. Pas d'axes, pas de légende — juste la forme. Parfait dans un dashboard ou une cellule de tableau.

## Comment
```
widget_display('canvas2d-sparklines', {
  values: [10, 15, 12, 20, 18, 25, 22, 30]
})
```

Avec couleur custom :
```
widget_display('canvas2d-sparklines', {
  values: [5, 3, 8, 2, 9, 4],
  color: '#e15759',
  filled: false
})
```

## Erreurs courantes
- Passer un tableau vide — le widget affiche un placeholder
- `color` doit être une couleur CSS valide (hex, hsl, rgb, nom)

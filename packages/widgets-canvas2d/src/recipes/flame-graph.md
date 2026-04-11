---
widget: canvas2d-flame-graph
description: Flame graph (profiling) — barres empilées horizontales, couleur par profondeur
group: canvas2d
schema:
  type: object
  required:
    - root
  properties:
    title:
      type: string
    root:
      type: object
      description: Arbre de frames {name, value, children?}
      required:
        - name
        - value
      properties:
        name:
          type: string
        value:
          type: number
          description: Durée ou poids du frame
        children:
          type: array
          items:
            type: object
---

## Quand utiliser
Pour visualiser des données de profiling (CPU, mémoire, call stacks). Chaque barre représente un frame, sa largeur est proportionnelle à sa durée. Les enfants sont empilés en dessous.

## Comment
```
widget_display('canvas2d-flame-graph', {
  title: 'CPU Profile',
  root: {
    name: 'main',
    value: 100,
    children: [
      { name: 'render', value: 60, children: [
        { name: 'layout', value: 30 },
        { name: 'paint', value: 25 }
      ]},
      { name: 'fetch', value: 35 }
    ]
  }
})
```

## Erreurs courantes
- La `value` du parent doit être >= la somme des `value` des enfants
- Oublier `name` ou `value` sur un frame

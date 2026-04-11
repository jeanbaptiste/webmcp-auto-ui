---
widget: text
description: Paragraphe de texte libre
group: simple
schema:
  type: object
  required:
    - content
  properties:
    content:
      type: string
---

## Quand utiliser
Pour afficher un paragraphe de texte explicatif, un résumé ou une description longue. Préférer `stat` pour un chiffre, `kv` pour des paires structurées.

## Comment
1. Rédiger ou récupérer le texte à afficher
2. Appeler `autoui_webmcp_widget_display('text', { content: 'Voici le résumé de l\'analyse...' })`

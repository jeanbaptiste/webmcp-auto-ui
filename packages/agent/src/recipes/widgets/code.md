---
widget: code
description: Bloc de code avec coloration syntaxique
group: simple
schema:
  type: object
  required:
    - content
  properties:
    lang:
      type: string
    content:
      type: string
---

## Quand utiliser
Pour afficher du code source, des snippets, des commandes shell ou toute sortie formatée en monospace. Spécifier `lang` pour activer la coloration syntaxique.

## Comment
1. Récupérer le code ou le générer selon la demande
2. Appeler `autoui_webmcp_widget_display('code', { lang: 'python', content: 'def hello():\n    print("Hello")' })`

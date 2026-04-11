---
widget: js-sandbox
description: Sandbox JavaScript isolée avec HTML/CSS
group: advanced
schema:
  type: object
  required:
    - code
  properties:
    title:
      type: string
    code:
      type: string
    html:
      type: string
    css:
      type: string
    height:
      type: string
---

## Quand utiliser
Pour exécuter du code JavaScript personnalisé dans un environnement isolé (iframe) — démos interactives, prototypes, visualisations custom, widgets sur mesure qu'aucun autre widget ne couvre.

## Comment
1. Écrire le code JS, et optionnellement le HTML/CSS associé
2. Appeler `autoui_webmcp_widget_display('js-sandbox', { title: 'Démo interactive', code: 'document.getElementById("app").textContent = "Hello!"', html: '<div id="app"></div>', css: '#app { font-size: 24px; }', height: '200px' })`

## Erreurs courantes
- Le code s'exécute dans un iframe isolé — pas d'accès au DOM parent ni aux variables globales de l'app
- Toujours fournir le `html` si le code JS manipule le DOM (sinon il n'y a rien à afficher)
- Ne pas utiliser ce widget quand un widget spécialisé existe (chart-rich, d3, etc.)

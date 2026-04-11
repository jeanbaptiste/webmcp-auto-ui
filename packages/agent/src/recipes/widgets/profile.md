---
widget: profile
description: Fiche profil avec champs et statistiques
group: rich
schema:
  type: object
  required:
    - name
  properties:
    name:
      type: string
    subtitle:
      type: string
    fields:
      type: array
      items:
        type: object
        required:
          - label
          - value
        properties:
          label:
            type: string
          value:
            type: string
    stats:
      type: array
      items:
        type: object
        required:
          - label
          - value
        properties:
          label:
            type: string
          value:
            type: string
---

## Quand utiliser
Pour afficher la fiche d'une personne ou d'une entité — employé, client, organisation. Combine identité, champs détaillés et statistiques résumées.

## Comment
1. Récupérer les informations de la personne/entité via MCP
2. Séparer les données en `fields` (détails textuels) et `stats` (chiffres clés)
3. Appeler `autoui_webmcp_widget_display('profile', { name: 'Alice Martin', subtitle: 'Développeuse Senior', fields: [{ label: 'Email', value: 'alice@ex.com' }], stats: [{ label: 'Projets', value: '12' }] })`

## Erreurs courantes
- Ne JAMAIS inventer d'URLs d'images pour l'avatar. Utiliser UNIQUEMENT les URLs retournées par les outils MCP. Si aucune URL n'est disponible, ne pas inclure de champ avatar — le widget affichera les initiales automatiquement.

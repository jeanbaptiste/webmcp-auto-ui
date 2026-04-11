---
widget: hemicycle
description: Hémicycle parlementaire avec groupes politiques
group: rich
schema:
  type: object
  required:
    - groups
  properties:
    title:
      type: string
    groups:
      type: array
      items:
        type: object
        required:
          - id
          - label
          - seats
          - color
        properties:
          id:
            type: string
          label:
            type: string
          seats:
            type: number
          color:
            type: string
    totalSeats:
      type: number
---

## Quand utiliser
Pour visualiser la composition d'une assemblée parlementaire ou tout ensemble réparti en groupes avec des proportions. Idéal pour les résultats électoraux et la répartition des sièges.

## Comment
1. Récupérer les données de composition via MCP (groupes, nombre de sièges, couleurs)
2. Appeler `autoui_webmcp_widget_display('hemicycle', { title: 'Assemblée nationale', groups: [{ id: 'lfi', label: 'LFI', seats: 75, color: '#cc2443' }, { id: 'ren', label: 'Renaissance', seats: 170, color: '#ffeb00' }], totalSeats: 577 })`

## Erreurs courantes
- Oublier un des 4 champs required dans chaque objet du tableau `groups` (id, label, seats, color sont TOUS obligatoires)
- Ne pas fournir de couleur hexadécimale valide

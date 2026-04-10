---
title: viewer2
description: Lecteur HyperSkills read-only avec CRUD, DAG de versions, et paste URI
sidebar:
  order: 2
---

viewer2 est un lecteur de HyperSkills en mode read-only. Il decode les URLs `?hs=` et affiche les skills avec l'ensemble des composants UI disponibles.

## Fonctionnalites

- **Decodage HyperSkill URL** : charge automatiquement depuis `?hs=` dans l'URL
- **Paste URI** : coller une URL HyperSkill pour la visualiser
- **CRUD skills** : creer, lire, mettre a jour, supprimer des skills localement
- **DAG de versions** : visualisation de l'arbre de versions via `previousHash`
- **Rendu complet** : tous les block types supportes via `BlockRenderer`
- **Theme** : respect des overrides de theme embarques dans la skill

## Architecture

```
viewer2/
  src/
    routes/
      +page.svelte    -- Page principale avec decodage URL et rendu
    lib/
      viewer.ts       -- Logique de decodage et gestion des versions
```

Packages utilises :
- `@webmcp-auto-ui/sdk` : `decode`, `getHsParam`, `hash`, skills registry
- `@webmcp-auto-ui/ui` : `BlockRenderer`, `ThemeProvider`

## Utilisation

```bash
npm -w apps/viewer2 run dev
```

1. Ouvrir l'app avec un parametre `?hs=` dans l'URL
2. Ou coller une URL HyperSkill dans le champ "Paste URI"
3. La skill est decodee et affichee en read-only

### URL d'exemple

```
http://localhost:5176/?hs=eyJtZXRhIjp7InRpdGxlIjoiV2VhdGhlciJ9LCJjb250ZW50IjpbeyJ0eXBlIjoic3RhdCIsImRhdGEiOnsibGFiZWwiOiJUZW1wIiwidmFsdWUiOiIxNEMifX1dfQ==
```

## Demo live

[demos.hyperskills.net/viewer2](https://demos.hyperskills.net/viewer2/)

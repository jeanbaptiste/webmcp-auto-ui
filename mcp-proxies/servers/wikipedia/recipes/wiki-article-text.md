---
name: wiki-article-text
description: Affiche le contenu complet d'un article Wikipedia en bloc texte formate
data_type: text
tools_used:
  - readArticle
---

## Quand utiliser

L'utilisateur demande de lire un article Wikipedia, d'afficher le contenu d'une page Wikipedia, de resumer un article, ou de consulter un sujet encyclopedique. Toute requete qui cible un article precis (par titre ou par sujet).

## Pipeline

1. Appeler `readArticle({title: "Titre de l'article"})` avec le titre exact de l'article Wikipedia. Le titre doit utiliser la casse Wikipedia (premiere lettre majuscule, espaces normaux).
2. Le resultat contient `{title, extract, pageid, url}`. Le champ `extract` contient le texte complet de l'article. Le champ `url` est le lien vers la page Wikipedia originale.
3. Construire le contenu texte : utiliser `title` comme titre, `extract` comme corps du texte. Ajouter le lien `url` en reference.
4. Afficher avec `autoui_webmcp_widget_display({name: "text", params: {title: title, content: extract, source: url}})`

## Exemple complet

### Requete utilisateur
> "Lis l'article Wikipedia sur la photosynthese"

### Appel outil
```json
{"tool": "readArticle", "arguments": {"title": "Photosynthesis"}}
```

### Resultat (extrait)
```json
{
  "title": "Photosynthesis",
  "extract": "Photosynthesis is a biological process used by many cellular organisms to convert light energy into chemical energy. It is the primary source of energy for nearly all life on Earth...",
  "pageid": 24703,
  "url": "https://en.wikipedia.org/wiki/Photosynthesis"
}
```

### Affichage
```json
autoui_webmcp_widget_display({
  name: "text",
  params: {
    title: "Photosynthesis",
    content: "Photosynthesis is a biological process used by many cellular organisms to convert light energy into chemical energy. It is the primary source of energy for nearly all life on Earth...",
    source: "https://en.wikipedia.org/wiki/Photosynthesis"
  }
})
```

## Erreurs courantes

- Ne JAMAIS inventer le contenu d'un article -- utiliser uniquement le champ `extract` retourne par l'outil
- Le titre doit correspondre exactement a un article Wikipedia existant -- en cas de doute, utiliser `search` d'abord pour trouver le titre exact
- Si `extract` est vide ou tres court, l'article peut etre une page de desambiguisation -- signaler a l'utilisateur et proposer une recherche
- Ne pas tronquer `extract` sans le signaler -- si le texte est trop long, resumer en le mentionnant explicitement
- Toujours inclure `url` comme source pour permettre a l'utilisateur de consulter l'article original

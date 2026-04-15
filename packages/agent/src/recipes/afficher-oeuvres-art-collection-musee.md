---
id: afficher-oeuvres-art-collection-musee
name: Afficher les oeuvres d'art d'une collection de musee en galerie visuelle
components_used: [gallery, cards, kv, stat-card]
when: l'utilisateur demande des oeuvres d'art, des collections de musee, des tableaux, sculptures ou objets d'art du Metropolitan Museum of Art
servers: [metmuseum]
layout:
  type: grid
  columns: 2
  arrangement: stats en haut, galerie pleine largeur au centre, details en bas
---

## Quand utiliser

L'utilisateur s'interesse a des oeuvres d'art ou des collections de musee :
- "Montre-moi des tableaux impressionnistes du Met Museum"
- "Les sculptures grecques du Metropolitan"
- "Quelles oeuvres de Van Gogh sont au Met ?"
- "Les oeuvres d'art egyptien du musee"
- "Cherche des estampes japonaises"

Le serveur Met Museum donne acces a la collection du Metropolitan Museum of Art de New York (plus de 470 000 oeuvres, dont beaucoup avec images en domaine public).

## Comment

1. **Rechercher les oeuvres** par theme, artiste ou departement :
   ```
   search_objects({query: "impressionism sunflower", hasImages: true})
   ```
   Retourne une liste d'`objectID`s.

2. **Recuperer les details** de chaque oeuvre (limiter a 5-10 pour la performance) :
   ```
   get_object({objectID: 436524})
   ```
   Retourne : `title`, `artistDisplayName`, `primaryImage`, `objectDate`, `medium`, `department`, `culture`, etc.

3. **Afficher les statistiques** de la recherche :
   ```
   component("stat-card", {label: "Resultats", value: total, icon: "image"})
   component("stat-card", {label: "Avec image", value: withImage, icon: "camera"})
   component("stat-card", {label: "Domaine public", value: publicDomain, icon: "unlock"})
   ```

4. **Galerie des oeuvres** avec images haute definition :
   ```
   component("gallery", {
     images: objects
       .filter(o => o.primaryImageSmall)
       .map(o => ({
         src: o.primaryImageSmall,
         alt: o.title + " — " + o.artistDisplayName,
         caption: o.objectDate + " | " + o.medium
       }))
   })
   ```

5. **Fiches detaillees** en cards pour les oeuvres principales :
   ```
   component("cards", {
     items: objects.map(o => ({
       title: o.title,
       subtitle: o.artistDisplayName || "Artiste inconnu",
       image: o.primaryImageSmall,
       body: [o.objectDate, o.medium, o.department].filter(Boolean).join(" — ")
     }))
   })
   ```

6. **Details d'une oeuvre specifique** en kv :
   ```
   component("kv", {pairs: [
     ["Titre", obj.title],
     ["Artiste", obj.artistDisplayName],
     ["Date", obj.objectDate],
     ["Medium", obj.medium],
     ["Dimensions", obj.dimensions],
     ["Departement", obj.department],
     ["Culture", obj.culture],
     ["Credit", obj.creditLine],
     ["Domaine public", obj.isPublicDomain ? "Oui" : "Non"]
   ]})
   ```

## Exemples

### Tableaux de Van Gogh
```
// 1. Recherche
search_objects({query: "van gogh", hasImages: true})  // → [436532, 436529, ...]

// 2. Details (premiers 8 resultats)
objectIDs.slice(0, 8).forEach(id => get_object({objectID: id}))

// 3. Rendu
component("stat-card", {label: "Oeuvres de Van Gogh", value: "8", icon: "palette"})
component("gallery", {images: vanGoghWorks.map(w => ({src: w.primaryImageSmall, alt: w.title, caption: w.objectDate}))})
component("cards", {items: vanGoghWorks.map(w => ({title: w.title, subtitle: w.objectDate, image: w.primaryImageSmall, body: w.medium}))})
```

### Art egyptien
```
// 1. Recherche par departement
search_objects({query: "egypt pharaoh", departmentId: 10, hasImages: true})

// 2. Rendu avec metadonnees culturelles
component("gallery", {images: egyptWorks.map(w => ({src: w.primaryImageSmall, alt: w.title}))})
component("table", {columns: ["Titre", "Periode", "Culture", "Medium"], rows: egyptDetails})
component("kv", {pairs: [["Departement", "Egyptian Art"], ["Source", "Met Museum — Open Access"]]})
```

## Erreurs courantes

- **Trop d'appels `get_object`** : la recherche retourne parfois des centaines d'IDs — limiter a 5-10 appels detail pour la performance
- **Oeuvres sans image** : beaucoup d'objets Met n'ont pas de `primaryImage` — toujours filtrer avec `hasImages: true` dans la recherche ou verifier le champ
- **Images haute resolution cassees** : utiliser `primaryImageSmall` (web-large) pour la galerie et les cards — les URLs `primaryImage` (original) retournent souvent des 404
- **Oublier la licence** : les oeuvres en domaine public (`isPublicDomain: true`) peuvent etre affichees librement, les autres ont un champ `rights` a respecter
- **Artiste inconnu** : beaucoup d'oeuvres anciennes n'ont pas d'`artistDisplayName` — afficher "Artiste inconnu" ou la culture/periode a la place

---
id: afficher-oeuvres-art-collection-musee
name: Display artworks from a museum collection in a visual gallery
components_used: [gallery, cards, kv, stat-card]
when: the user asks for artworks, museum collections, paintings, sculptures, or art objects from the Metropolitan Museum of Art
servers: [metmuseum]
layout:
  type: grid
  columns: 2
  arrangement: stats at top, full-width gallery in the center, details at the bottom
---

## When to use

The user is interested in artworks or museum collections:
- "Show me Impressionist paintings from the Met Museum"
- "Greek sculptures at the Metropolitan"
- "What Van Gogh works are at the Met?"
- "Egyptian art objects from the museum"
- "Search for Japanese woodblock prints"

The Met Museum server provides access to the Metropolitan Museum of Art collection in New York (more than 470,000 objects, many with public domain images).

## How to use

1. **Search for artworks** by theme, artist, or department:
   ```
   search_objects({query: "impressionism sunflower", hasImages: true})
   ```
   Returns a list of `objectID`s.

2. **Fetch the details** of each artwork (limit to 5-10 for performance):
   ```
   get_object({objectID: 436524})
   ```
   Returns: `title`, `artistDisplayName`, `primaryImage`, `objectDate`, `medium`, `department`, `culture`, etc.

3. **Display search statistics**:
   ```
   component("stat-card", {label: "Results", value: total, icon: "image"})
   component("stat-card", {label: "With image", value: withImage, icon: "camera"})
   component("stat-card", {label: "Public domain", value: publicDomain, icon: "unlock"})
   ```

4. **Artwork gallery** with high-resolution images:
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

5. **Detailed cards** for the main artworks:
   ```
   component("cards", {
     items: objects.map(o => ({
       title: o.title,
       subtitle: o.artistDisplayName || "Unknown artist",
       image: o.primaryImageSmall,
       body: [o.objectDate, o.medium, o.department].filter(Boolean).join(" — ")
     }))
   })
   ```

6. **Details of a specific artwork** in kv:
   ```
   component("kv", {pairs: [
     ["Title", obj.title],
     ["Artist", obj.artistDisplayName],
     ["Date", obj.objectDate],
     ["Medium", obj.medium],
     ["Dimensions", obj.dimensions],
     ["Department", obj.department],
     ["Culture", obj.culture],
     ["Credit", obj.creditLine],
     ["Public domain", obj.isPublicDomain ? "Yes" : "No"]
   ]})
   ```

## Examples

### Van Gogh paintings
```
// 1. Search
search_objects({query: "van gogh", hasImages: true})  // → [436532, 436529, ...]

// 2. Details (first 8 results)
objectIDs.slice(0, 8).forEach(id => get_object({objectID: id}))

// 3. Render
component("stat-card", {label: "Van Gogh works", value: "8", icon: "palette"})
component("gallery", {images: vanGoghWorks.map(w => ({src: w.primaryImageSmall, alt: w.title, caption: w.objectDate}))})
component("cards", {items: vanGoghWorks.map(w => ({title: w.title, subtitle: w.objectDate, image: w.primaryImageSmall, body: w.medium}))})
```

### Egyptian art
```
// 1. Search by department
search_objects({query: "egypt pharaoh", departmentId: 10, hasImages: true})

// 2. Render with cultural metadata
component("gallery", {images: egyptWorks.map(w => ({src: w.primaryImageSmall, alt: w.title}))})
component("table", {columns: ["Title", "Period", "Culture", "Medium"], rows: egyptDetails})
component("kv", {pairs: [["Department", "Egyptian Art"], ["Source", "Met Museum — Open Access"]]})
```

## Common mistakes

- **Too many `get_object` calls**: a search sometimes returns hundreds of IDs — limit to 5-10 detail calls for performance
- **Artworks without images**: many Met objects have no `primaryImage` — always filter with `hasImages: true` in the search or check the field
- **Broken high-resolution images**: use `primaryImageSmall` (web-large) for the gallery and cards — `primaryImage` (original) URLs often return 404s
- **Forgetting the license**: works in the public domain (`isPublicDomain: true`) can be displayed freely; others have a `rights` field to respect
- **Unknown artist**: many ancient works have no `artistDisplayName` — display "Unknown artist" or the culture/period instead

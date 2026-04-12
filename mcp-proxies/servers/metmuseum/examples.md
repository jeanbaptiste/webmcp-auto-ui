# Meta-recipe: Impressionist Gallery

A concrete scenario that searches for Impressionist artworks, displays them in an image gallery, then creates detailed cards for notable pieces.

## Step 1 -- Search for Impressionist works

**User prompt:**
> Search the Met for Impressionist paintings and show me a gallery.

**Expected tool calls:**

```
Tool: search-museum-objects
Args: { "query": "impressionism painting" }
```

**Agent behavior:**
The agent calls `search-museum-objects` with the keyword query. The API returns `{total, objectIDs[]}`. Since the result can contain thousands of IDs, the agent selects the first 12-20 IDs to fetch details for.

**Follow-up tool calls (batched):**

```
Tool: get-museum-object
Args: { "objectID": 437133 }

Tool: get-museum-object
Args: { "objectID": 436965 }

Tool: get-museum-object
Args: { "objectID": 438722 }
... (up to 12-20 calls)
```

**Agent behavior:**
For each object, the agent extracts `primaryImage`, `title`, `artistDisplayName`, and `objectDate`. Objects without a `primaryImage` are skipped. The results render as an image gallery using the `met-artwork-gallery` recipe.

**Sample gallery output:**

- "Water Lilies" -- Claude Monet, 1906 -- [high-res image]
- "A Woman with a Dog" -- Pierre-Auguste Renoir, 1876 -- [high-res image]
- "The Dance Class" -- Edgar Degas, ca. 1874 -- [high-res image]

## Step 2 -- Create detail cards for selected works

**User prompt:**
> Show me detail cards for the Monet and Degas pieces.

**Expected tool calls:**

```
Tool: get-museum-object
Args: { "objectID": 437133 }

Tool: get-museum-object
Args: { "objectID": 436141 }
```

(If objects were already fetched in step 1, cached data can be reused.)

**Agent behavior:**
The agent renders each object as a card using the `met-search-cards` recipe. Each card shows:
- Thumbnail image (`primaryImageSmall`)
- Title and artist
- Date and medium
- Department and culture
- Link to the Met website (`objectURL`)

**Sample card:**

```
+---------------------------------------+
| [Thumbnail]                           |
| Water Lilies                          |
| Claude Monet, 1906                    |
| Oil on canvas                         |
| European Paintings | French           |
| metmuseum.org/art/collection/...      |
+---------------------------------------+
```

## Combined flow

**User prompt:**
> Build me an Impressionist gallery: search for works, show the top 10 as images, then give me detail cards for any Monet pieces.

**Expected tool calls:**

```
Tool: search-museum-objects
Args: { "query": "impressionism painting monet" }
```

Then batch `get-museum-object` for the first 10 IDs with images.

**Agent behavior:**
1. Search and fetch 10 objects with images -- render as gallery (`met-artwork-gallery`)
2. Filter for objects where `artistDisplayName` contains "Monet" -- render as cards (`met-search-cards`)

Both renderings appear in sequence: the full gallery first, then the Monet detail cards below.

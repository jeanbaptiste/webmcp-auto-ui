# Wikipedia Examples

## Meta-recipe: Thematic Research

Search for articles on artificial intelligence, display results as cards, then read a full article and display it as a text block.

### Step 1 -- Search for articles

User prompt:
> Find Wikipedia articles about artificial intelligence

Expected tool call:
```json
{
  "tool": "search",
  "arguments": {
    "query": "artificial intelligence",
    "limit": 10
  }
}
```

Returns an array of matching articles with titles, snippets, and page IDs.

### Step 2 -- Display search results as cards

The agent uses the `wiki-search-cards` recipe pattern to render results as a card grid. Each card shows:
- Article title (linked to Wikipedia)
- Snippet text (HTML tags stripped)
- Page ID for reference

### Step 3 -- Read a specific article

The user selects an article, or the agent picks the most relevant one.

Expected tool call:
```json
{
  "tool": "readArticle",
  "arguments": {
    "title": "Artificial intelligence"
  }
}
```

### Step 4 -- Display the full article

The agent uses the `wiki-article-text` recipe pattern to render the article content as a formatted text block with:
- Article title as heading
- Full text content (potentially summarized if very long)
- Link to the original Wikipedia page

### Combined prompt

> Search Wikipedia for articles about artificial intelligence, show me the results as cards, then open the main article and display its content.

This triggers both recipes in sequence: card rendering of search results, followed by full text rendering of the selected article.

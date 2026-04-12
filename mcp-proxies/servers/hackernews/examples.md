# Meta-recipe: Daily HN Dashboard

A concrete scenario that combines the two recipes: fetch front page stories as a sortable table, then aggregate statistics into charts.

## Step 1 -- Fetch and display the front page

**User prompt:**
> Show me today's Hacker News front page as a sortable table.

**Expected tool calls:**

```
Tool: get-front-page
Args: {}
```

**Agent behavior:**
The agent calls `get-front-page`, receives an array of story objects, and renders them using the `hn-stories-table` recipe. The table includes columns for title, score, author, comment count, and age. Default sort is by score descending.

**Sample response structure:**

| Title | Score | Author | Comments | Age |
|-------|-------|--------|----------|-----|
| Show HN: New open-source project | 342 | pg | 128 | 3h |
| Why Rust is taking over systems programming | 287 | dang | 95 | 5h |
| ... | ... | ... | ... | ... |

## Step 2 -- Aggregate stats into charts

**User prompt:**
> Now show me stats: score distribution, top domains, and posting frequency by hour.

**Expected tool calls:**

```
Tool: get-front-page
Args: {}
```

(Reuses cached data if available, otherwise re-fetches.)

**Agent behavior:**
The agent processes the stories array using the `hn-stats-dashboard` recipe and produces three charts:

1. **Score distribution** -- Histogram of story scores (buckets: 0-50, 50-100, 100-200, 200-500, 500+)
2. **Top domains** -- Bar chart of the most linked domains extracted from story URLs
3. **Posting frequency** -- Line chart showing number of stories per hour over the last 24h (derived from unix timestamps)

## Combined dashboard

**User prompt:**
> Give me a full HN dashboard: table of current stories sorted by score, plus charts for score distribution, top domains, and posting frequency.

**Expected tool calls:**

```
Tool: get-front-page
Args: {}
```

**Agent behavior:**
Single fetch, dual rendering. The agent calls `get-front-page` once and renders both:
- The sortable table (recipe `hn-stories-table`)
- The three charts (recipe `hn-stats-dashboard`)

The result is a complete dashboard view combining tabular and visual data from one API call.

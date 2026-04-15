---
id: analyser-actualites-hacker-news
name: Analyze Hacker News news and trends with tables and charts
components_used: [table, chart, stat-card, cards]
when: the user asks for tech news, Hacker News trends, top stories, or an analysis of HN discussions and comments
servers: [hackernews]
layout:
  type: grid
  columns: 2
  arrangement: stats in a row, full-width table, chart at the bottom
---

## When to use

The user is interested in technology news or Hacker News community trends:
- "What are the top Hacker News stories?"
- "Show me the most commented posts today"
- "This week's tech trends on HN"
- "Analyze recent Ask HN posts"
- "What topics are dominating Hacker News right now?"

The Hacker News server provides access to stories, comments, rankings, and post metadata.

## How to use

1. **Fetch the top stories**:
   ```
   get_top_stories({limit: 30})
   ```
   Returns the IDs of the most popular stories.

2. **Fetch the details** of each story:
   ```
   get_item({id: storyId})
   ```
   Returns: `title`, `url`, `score`, `by` (author), `descendants` (comment count), `time`, `type`.

3. **Display KPIs** in stat-cards:
   ```
   component("stat-card", {label: "Top Stories", value: "30", icon: "newspaper"})
   component("stat-card", {label: "Average score", value: Math.round(avgScore), icon: "trending-up"})
   component("stat-card", {label: "Average comments", value: Math.round(avgComments), icon: "message-circle"})
   component("stat-card", {label: "Max score", value: maxScore + " pts", icon: "award"})
   ```

4. **Stories table** sorted by score:
   ```
   component("table", {
     columns: ["#", "Title", "Score", "Comments", "Author"],
     rows: stories.sort((a, b) => b.score - a.score).map((s, i) => [
       i + 1, s.title, s.score, s.descendants, s.by
     ])
   })
   ```

5. **Score distribution chart**:
   ```
   component("chart", {
     type: "bar",
     labels: stories.map(s => s.title.slice(0, 30) + "..."),
     datasets: [{label: "Score", data: stories.map(s => s.score)}]
   })
   ```

6. **Cards for featured stories** (top 5):
   ```
   component("cards", {
     items: top5.map(s => ({
       title: s.title,
       subtitle: s.by + " — " + s.score + " points",
       body: s.descendants + " comments | " + new Date(s.time * 1000).toLocaleDateString(),
       url: s.url
     }))
   })
   ```

## Examples

### Top 10 stories right now
```
// 1. Fetch
get_top_stories({limit: 10})
// For each ID: get_item({id})

// 2. Render
component("stat-card", {label: "Total score", value: totalScore, icon: "zap"})
component("stat-card", {label: "Total comments", value: totalComments, icon: "message-circle"})
component("table", {
  columns: ["Rank", "Title", "Score", "Comments", "Author", "Age"],
  rows: rankedStories
})
component("cards", {items: top3Stories})
```

### Ask HN analysis
```
// 1. Fetch recent Ask HN posts
get_ask_stories({limit: 20})

// 2. Render
component("stat-card", {label: "Recent Ask HN", value: "20", icon: "help-circle"})
component("stat-card", {label: "Average replies", value: avgReplies, icon: "message-circle"})
component("table", {columns: ["Title", "Replies", "Score", "Author"], rows: askStories})
component("chart", {type: "bar", labels: titles, datasets: [{label: "Replies", data: replyCounts}]})
```

### Trends by domain
```
// 1. Fetch top stories and extract domains from URLs
get_top_stories({limit: 50})

// 2. Group by domain
const domains = groupBy(stories, s => new URL(s.url).hostname)

// 3. Render
component("stat-card", {label: "Unique domains", value: Object.keys(domains).length, icon: "globe"})
component("chart", {type: "bar", labels: topDomains.map(d => d.name), datasets: [{label: "Stories", data: topDomains.map(d => d.count)}]})
component("table", {columns: ["Domain", "Stories", "Total score"], rows: domainStats})
```

## Common mistakes

- **Too many `get_item` calls**: each story requires an individual call — limit to 20-30 to avoid slowness
- **Unconverted timestamps**: HN returns Unix timestamps — convert them to human-readable dates
- **Truncated titles in charts**: HN titles are long — truncate to 30-40 characters for chart labels
- **Forgetting stories without a URL**: "Ask HN", "Show HN", and "Tell HN" posts don't always have an external URL — handle this case
- **Not distinguishing types**: HN has stories, jobs, and polls — filter by type if the user asks for a specific type

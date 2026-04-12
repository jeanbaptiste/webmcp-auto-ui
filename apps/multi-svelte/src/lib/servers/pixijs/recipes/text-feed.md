---
widget: pixijs-text-feed
description: Scrolling text feed with animated entries — ticker/news style display
schema:
  type: object
  properties:
    messages:
      type: array
      items:
        type: string
      description: Text messages to display in the feed
    speed:
      type: number
      description: Scroll speed (default 1)
    color:
      type: string
      description: Text color (hex)
    fontSize:
      type: number
      description: Font size in pixels (default 14)
    title:
      type: string
  required:
    - messages
---

## When to use

Use pixijs-text-feed for scrolling text displays. Ideal for:
- News tickers
- Log/event feeds
- Notification streams

## Examples

```json
{
  "messages": [
    "Server deployed successfully",
    "New user registered: alice@example.com",
    "Database backup completed",
    "API response time: 42ms"
  ],
  "title": "Event Feed"
}
```

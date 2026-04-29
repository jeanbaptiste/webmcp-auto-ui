---
id: hn-user-profile
name: HackerNews user profile
description: Fiche profil HN — bio, karma, ancienneté + posts récents de l'utilisateur.
when: the user asks who is, profile of, or posts by a specific HackerNews username
servers: [hackernews]
tools_used: [get-user, search-posts]
data_type: profile
components_used: [profile, stat-card, table, chart-rich]
layout:
  type: grid
  columns: 2
  arrangement: profile card full-width, stat-cards row, posts table, score timeline
---

## When to use

The user wants a 360° view of an HN user:
- "Who is 'pg' on HackerNews?"
- "Show me posts by 'tptacek'"
- "Profile of HN user 'dang'"
- "What does 'patio11' post about on HN?"
- "Stats on HN user 'antirez'"

This recipe combines `get-user` (static profile) with `search-posts` (their content) for a complete view.

## How to use

1. **Fetch the user profile**:
   ```js
   const user = await call('get-user', { username: 'pg' });
   ```

2. **Fetch their recent stories** via the `author_USERNAME` tag:
   ```js
   const res = await call('search-posts', {
     query: '',
     tags: [`author_${user.username}`, 'story'],
     numericFilters: ['points>=20'],
     hitsPerPage: 50
   });
   const posts = res.hits;
   ```

3. **Profile card** (bio, karma, since):
   ```js
   const since = new Date(user.created_at_i * 1000).getFullYear();
   await widget('profile', {
     name: user.username,
     subtitle: `${user.karma} karma · since ${since}`,
     body: (user.about || '(no bio)').replace(/<[^>]+>/g, ''),
     url: `https://news.ycombinator.com/user?id=${user.username}`
   });
   ```

4. **KPI stat-cards**:
   ```js
   await widget('stat-card', { label: 'Karma', value: user.karma, icon: 'star' });
   await widget('stat-card', { label: 'Account age (yrs)', value: new Date().getFullYear() - new Date(user.created_at_i * 1000).getFullYear(), icon: 'calendar' });
   await widget('stat-card', { label: 'Recent stories', value: posts.length, icon: 'file-text' });
   await widget('stat-card', { label: 'Top score', value: Math.max(0, ...posts.map(p => p.points || 0)), icon: 'flame' });
   ```

5. **Recent posts table**:
   ```js
   await widget('table', {
     columns: ['Title', 'Points', 'Comments', 'Date'],
     rows: posts.map(p => [
       p.title,
       p.points || 0,
       p.num_comments || 0,
       p.created_at.slice(0, 10)
     ])
   });
   ```

6. **Score timeline** (post score over time):
   ```js
   await widget('chart-rich', {
     type: 'line',
     title: `Score timeline — ${user.username}`,
     data: [...posts]
       .sort((a, b) => a.created_at_i - b.created_at_i)
       .map(p => ({ label: p.created_at.slice(0, 7), value: p.points || 0 }))
   });
   ```

## Examples

### Profile pg
```js
const user = await call('get-user', { username: 'pg' });
const { hits } = await call('search-posts', {
  query: '',
  tags: ['author_pg', 'story'],
  numericFilters: ['points>=50'],
  hitsPerPage: 50
});
await widget('profile', {
  name: user.username,
  subtitle: `${user.karma} karma`,
  body: (user.about || '').replace(/<[^>]+>/g, '')
});
await widget('stat-card', { label: 'Karma', value: user.karma, icon: 'star' });
await widget('table', {
  columns: ['Title', 'Points', 'Date'],
  rows: hits.slice(0, 20).map(p => [p.title, p.points, p.created_at.slice(0, 10)])
});
```

### Profile dang (moderator)
```js
const user = await call('get-user', { username: 'dang' });
await widget('profile', {
  name: user.username,
  subtitle: `${user.karma} karma · moderator`,
  body: (user.about || '(no bio)').replace(/<[^>]+>/g, '')
});
const { hits } = await call('search-posts', {
  query: '',
  tags: ['author_dang', 'comment'],
  hitsPerPage: 20
});
await widget('table', {
  columns: ['Comment on', 'Points', 'Date'],
  rows: hits.map(c => [c.story_title || '?', c.points || 0, c.created_at.slice(0, 10)])
});
```

## Common mistakes

- **Username case-sensitivity**: HN usernames are case-sensitive — `pg` and `PG` are different users; pass exactly what the user typed
- **`about` field is HTML**: strip tags with `.replace(/<[^>]+>/g, '')` for plain rendering, or pass `html: true` to a widget that supports it
- **`created_at_i` is in seconds, not ms**: multiply by 1000 before `new Date(...)`
- **`author_USERNAME` tag is case-sensitive too**: use the exact username from the profile, not a normalized version
- **Empty `query: ''` with author tag**: this works on HN Algolia, but pair it with `tags: ['story']` (or `comment`) to avoid mixing types
- **Skipping the `numericFilters`**: an active user with thousands of low-score comments will saturate the response — filter `points>=20` for stories or use pagination

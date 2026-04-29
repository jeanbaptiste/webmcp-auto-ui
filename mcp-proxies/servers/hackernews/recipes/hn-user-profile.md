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
   const user = await call('get-user', { username: 'pg' }).catch(() => null);
   if (!user || !user.username) return widget('text', { content: 'User not found.' });
   ```

2. **Fetch their recent stories** via the `author_USERNAME` tag:
   ```js
   const res = await call('search-posts', {
     query: '',
     tags: [`author_${user.username}`, 'story'],
     numericFilters: ['points>=20'],
     hitsPerPage: 50
   }).catch(() => null);
   const posts = (res?.hits ?? []).filter(p => p);
   ```

3. **Profile card** (bio, karma, since):
   ```js
   const createdMs = (user?.created_at_i ?? 0) * 1000;
   const since = createdMs > 0 ? new Date(createdMs).getFullYear() : '—';
   await widget('profile', {
     name: user?.username ?? '—',
     subtitle: `${user?.karma ?? 0} karma · since ${since}`,
     body: (user?.about ?? '(no bio)').replace(/<[^>]+>/g, ''),
     url: `https://news.ycombinator.com/user?id=${user?.username ?? ''}`
   });
   ```

4. **KPI stat-cards**:
   ```js
   const createdMs = (user?.created_at_i ?? 0) * 1000;
   const ageYears = createdMs > 0 ? new Date().getFullYear() - new Date(createdMs).getFullYear() : 0;
   const scores = posts.map(p => p?.points || 0).filter(Number.isFinite);
   await widget('stat-card', { label: 'Karma', value: user?.karma ?? 0, icon: 'star' });
   await widget('stat-card', { label: 'Account age (yrs)', value: ageYears, icon: 'calendar' });
   await widget('stat-card', { label: 'Recent stories', value: posts.length, icon: 'file-text' });
   await widget('stat-card', { label: 'Top score', value: scores.length > 0 ? Math.max(...scores) : 0, icon: 'flame' });
   ```

5. **Recent posts table**:
   ```js
   await widget('table', {
     columns: ['Title', 'Points', 'Comments', 'Date'],
     rows: posts.map(p => [
       p?.title ?? '(untitled)',
       p?.points ?? 0,
       p?.num_comments ?? 0,
       p?.created_at?.slice(0, 10) ?? '—'
     ])
   });
   ```

6. **Score timeline** (post score over time):
   ```js
   await widget('chart-rich', {
     type: 'line',
     title: `Score timeline — ${user?.username ?? '—'}`,
     data: [...posts]
       .sort((a, b) => (a?.created_at_i ?? 0) - (b?.created_at_i ?? 0))
       .map(p => ({ label: p?.created_at?.slice(0, 7) ?? '—', value: p?.points ?? 0 }))
   });
   ```

## Examples

### Profile pg
```js
const user = await call('get-user', { username: 'pg' }).catch(() => null);
if (!user) return widget('text', { content: 'User not found.' });
const res = await call('search-posts', {
  query: '',
  tags: ['author_pg', 'story'],
  numericFilters: ['points>=50'],
  hitsPerPage: 50
}).catch(() => null);
const hits = (res?.hits ?? []).filter(p => p);
await widget('profile', {
  name: user?.username ?? '—',
  subtitle: `${user?.karma ?? 0} karma`,
  body: (user?.about ?? '').replace(/<[^>]+>/g, '')
});
await widget('stat-card', { label: 'Karma', value: user?.karma ?? 0, icon: 'star' });
await widget('table', {
  columns: ['Title', 'Points', 'Date'],
  rows: hits.slice(0, 20).map(p => [p?.title ?? '(untitled)', p?.points ?? 0, p?.created_at?.slice(0, 10) ?? '—'])
});
```

### Profile dang (moderator)
```js
const user = await call('get-user', { username: 'dang' }).catch(() => null);
if (!user) return widget('text', { content: 'User not found.' });
await widget('profile', {
  name: user?.username ?? '—',
  subtitle: `${user?.karma ?? 0} karma · moderator`,
  body: (user?.about ?? '(no bio)').replace(/<[^>]+>/g, '')
});
const res = await call('search-posts', {
  query: '',
  tags: ['author_dang', 'comment'],
  hitsPerPage: 20
}).catch(() => null);
const hits = (res?.hits ?? []).filter(p => p);
await widget('table', {
  columns: ['Comment on', 'Points', 'Date'],
  rows: hits.map(c => [c?.story_title ?? '?', c?.points ?? 0, c?.created_at?.slice(0, 10) ?? '—'])
});
```

## Common mistakes

- **Username case-sensitivity**: HN usernames are case-sensitive — `pg` and `PG` are different users; pass exactly what the user typed
- **`about` field is HTML**: strip tags with `.replace(/<[^>]+>/g, '')` for plain rendering, or pass `html: true` to a widget that supports it
- **`created_at_i` is in seconds, not ms**: multiply by 1000 before `new Date(...)`
- **`author_USERNAME` tag is case-sensitive too**: use the exact username from the profile, not a normalized version
- **Empty `query: ''` with author tag**: this works on HN Algolia, but pair it with `tags: ['story']` (or `comment`) to avoid mixing types
- **Skipping the `numericFilters`**: an active user with thousands of low-score comments will saturate the response — filter `points>=20` for stories or use pagination

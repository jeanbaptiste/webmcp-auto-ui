---
id: nasa-osdr-bio-study
name: Inventory of files for an OSDR biology study
description: File inventory, total volume KPI and study description from NASA OSDR
when: the user asks about a NASA Open Science biology study, OSD-XX, ISS biology data or astrobiology files
servers: [nasa]
tools_used: [nasa_osdr_files]
data_type: bio-data study inventory
components_used: [table, kv, stat-card, text]
layout:
  type: stack
  arrangement: text intro, KPI stats, kv study metadata, table of files
---

## When to use

The user wants to inspect a space-biology study before downloading:
- "What's in OSD-87?"
- "Files for ISS rodent study"
- "NASA biology repository data"
- "Astrobiology dataset listing"

OSDR is NASA's repository for life sciences (rodents, plants, microbes flown to ISS or studied in analog environments).

## How to use

```js
// 1. List files for a study
const acc = 87; // integer — API is strict about type
const res = await call('nasa_osdr_files', { accession_number: acc }).catch(() => null);
console.log('OSDR top-level keys:', JSON.stringify(Object.keys(res ?? {})));
if (!res || res.error) return widget('text', { content: 'Study not found.' });

// OSDR shape varies; common: studies object with file metadata
const studyContainer = res?.studies ?? res?.study ?? {};
const studyKey = Object.keys(studyContainer)[0];
const study = studyKey ? (studyContainer[studyKey] ?? {}) : {};
const files = (study?.study_files ?? study?.files ?? res?.files ?? []).filter(f => f);

// 2. Intro text
await widget('text', {
  content: study?.title || study?.identifier || `NASA Open Science study OSD-${acc}. Listed below are the data files associated with the experiment.`
});

// 3. KPI stats
const totalSize = files.reduce((s, f) => s + (+(f?.file_size) || 0), 0);
const types = new Set(files.map(f => (f?.file_name ?? '').split('.').pop()).filter(Boolean));
await widget('stat-card', { label: 'Files', value: files.length, icon: 'file' });
await widget('stat-card', { label: 'Total volume (MB)', value: (totalSize / 1024 / 1024).toFixed(1), icon: 'database' });
await widget('stat-card', { label: 'File types', value: types.size, icon: 'layers' });

// 4. Study metadata kv
await widget('kv', {
  rows: [
    ['Accession', `OSD-${acc}`],
    ['Title', study?.title],
    ['Organism', study?.organism],
    ['Mission', study?.mission],
    ['Project type', study?.project_type]
  ].filter(r => r[1])
});

// 5. Files table
await widget('data-table', {
  columns: ['File name', 'Category', 'Size (MB)', 'Updated'],
  rows: files.slice(0, 50).map(f => [
    f?.file_name ?? '—',
    f?.category || f?.file_type || '',
    ((+(f?.file_size) || 0) / 1024 / 1024).toFixed(2),
    f?.date_modified || f?.date_created || ''
  ])
});
```

## Examples

### OSD-87
```js
const r = await call('nasa_osdr_files', { accession_number: 87 }).catch(() => null);
const extractFiles = r => r?.study_files ?? r?.files ?? (Array.isArray(r) ? r : null) ?? Object.values(r?.studies ?? r?.study ?? {})[0]?.study_files ?? [];
const files = extractFiles(r).filter(Boolean);
await widget('stat-card', { label: 'OSD-87 files', value: files.length });
await widget('data-table', { columns: ['Name', 'Size'], rows: files.slice(0, 30).map(f => [f?.file_name ?? '—', f?.file_size ?? '—']) });
```

### Cross-study summary
```js
const extractFiles = r => r?.study_files ?? r?.files ?? (Array.isArray(r) ? r : null) ?? Object.values(r?.studies ?? r?.study ?? {})[0]?.study_files ?? [];
const ids = [87, 102, 120];
const all = await Promise.all(ids.map(i => call('nasa_osdr_files', { accession_number: i }).catch(() => null)));
const counts = ids.map((id, i) => ({ id, n: extractFiles(all[i]).length }));
await widget('data-table', { columns: ['Study', 'Files'], rows: counts.map(c => [`OSD-${c.id}`, c.n]) });
```

## Common mistakes

- Hardcoding the response shape — OSDR sometimes returns `studies`, sometimes `study`; defensive lookups required
- Showing raw byte counts — convert to MB/GB for readability
- Skipping `category` — it tells the user whether the file is raw, processed or metadata
- Asking for non-existent accession numbers — OSDR returns an empty object, handle the empty case
- Listing 5000 files — many studies have huge numbers, slice to top 50 with a "see more" hint

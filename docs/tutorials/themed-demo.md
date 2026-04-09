# Build a Themed Demo from Scratch

This tutorial walks through creating a complete themed demo using webmcp-auto-ui. We will build a "Nature Observatory" dashboard that displays wildlife sightings with a nature-inspired color palette.

By the end, you will have a working SvelteKit page with themed components, wired together with the FONC event bus, exportable as a shareable HyperSkill URL.

## Prerequisites

- The monorepo is cloned and `npm install` has been run
- Packages are built (see the [Deploy tutorial](./deploy.md), Step 1)
- Basic familiarity with Svelte 5 and JSON

---

## Step 1: Create the theme

Create a file `theme.json` at the root of your app (for example, `apps/showcase/theme.json`):

```json
{
  "name": "nature-observatory",
  "tokens": {
    "color-bg":       "#f4f1eb",
    "color-surface":  "#ffffff",
    "color-surface2": "#ede8df",
    "color-border":   "rgba(101, 78, 50, 0.10)",
    "color-border2":  "rgba(101, 78, 50, 0.20)",
    "color-accent":   "#2d6a4f",
    "color-accent2":  "#bc4749",
    "color-amber":    "#b07d1e",
    "color-teal":     "#40916c",
    "color-text1":    "#2b2118",
    "color-text2":    "#7a6e5d"
  },
  "dark": {
    "color-bg":       "#1a1612",
    "color-surface":  "#252019",
    "color-surface2": "#302a21",
    "color-border":   "rgba(210, 190, 160, 0.10)",
    "color-border2":  "rgba(210, 190, 160, 0.20)",
    "color-accent":   "#52b788",
    "color-text1":    "#ede8df",
    "color-text2":    "#a89b88"
  }
}
```

This theme uses earthy greens and browns:
- **accent** (`#2d6a4f`): deep forest green for primary actions and links
- **accent2** (`#bc4749`): warm red for alerts (endangered species warnings)
- **teal** (`#40916c`): lighter green for success states
- **amber** (`#b07d1e`): golden brown for warnings
- **bg/surface**: warm off-whites that feel like parchment
- **text**: dark brown instead of pure black

---

## Step 2: Create a skill

A skill defines a set of instructions for the agent, including which blocks to produce and with what metadata. Create `nature-observatory.skill.json`:

```json
{
  "name": "nature-observatory",
  "description": "Wildlife sighting dashboard for a nature reserve",
  "tags": ["nature", "wildlife", "dashboard"],
  "theme": {
    "color-bg":       "#f4f1eb",
    "color-surface":  "#ffffff",
    "color-surface2": "#ede8df",
    "color-border":   "rgba(101, 78, 50, 0.10)",
    "color-border2":  "rgba(101, 78, 50, 0.20)",
    "color-accent":   "#2d6a4f",
    "color-accent2":  "#bc4749",
    "color-amber":    "#b07d1e",
    "color-teal":     "#40916c",
    "color-text1":    "#2b2118",
    "color-text2":    "#7a6e5d"
  },
  "blocks": [
    {
      "type": "stat",
      "data": {
        "label": "Species Observed",
        "value": "347",
        "trend": "+12",
        "trendDir": "up"
      }
    },
    {
      "type": "stat",
      "data": {
        "label": "Sightings This Week",
        "value": "1,204",
        "trend": "+8.3%",
        "trendDir": "up"
      }
    },
    {
      "type": "stat",
      "data": {
        "label": "Endangered Alerts",
        "value": "3",
        "trend": "+1",
        "trendDir": "up"
      }
    },
    {
      "type": "chart-rich",
      "data": {
        "title": "Sightings by Month",
        "type": "area",
        "labels": ["Jan", "Feb", "Mar", "Apr", "May", "Jun"],
        "data": [
          { "label": "Birds", "values": [120, 145, 210, 320, 410, 380], "color": "#2d6a4f" },
          { "label": "Mammals", "values": [45, 52, 68, 95, 110, 102], "color": "#b07d1e" },
          { "label": "Reptiles", "values": [15, 18, 35, 55, 72, 68], "color": "#40916c" }
        ]
      }
    },
    {
      "type": "data-table",
      "data": {
        "title": "Recent Sightings",
        "columns": [
          { "key": "species", "label": "Species" },
          { "key": "location", "label": "Location" },
          { "key": "date", "label": "Date" },
          { "key": "observer", "label": "Observer" },
          { "key": "status", "label": "Status" }
        ],
        "rows": [
          { "species": "Red-tailed Hawk", "location": "North Ridge", "date": "2026-04-05", "observer": "A. Muir", "status": "Confirmed" },
          { "species": "River Otter", "location": "Willow Creek", "date": "2026-04-05", "observer": "B. Carson", "status": "Confirmed" },
          { "species": "Timber Rattlesnake", "location": "Rocky Ledge", "date": "2026-04-04", "observer": "C. Leopold", "status": "Pending" },
          { "species": "Bald Eagle", "location": "Eagle Point", "date": "2026-04-04", "observer": "A. Muir", "status": "Confirmed" },
          { "species": "Black Bear", "location": "Pine Hollow", "date": "2026-04-03", "observer": "D. Thoreau", "status": "Confirmed" }
        ]
      }
    },
    {
      "type": "profile",
      "data": {
        "name": "North Ridge Reserve",
        "subtitle": "Established 1987 -- 12,400 acres",
        "badge": { "text": "Active", "variant": "success" },
        "fields": [
          { "label": "Region", "value": "Appalachian Highlands" },
          { "label": "Elevation", "value": "800-2,200m" },
          { "label": "Habitats", "value": "Forest, Wetland, Alpine" }
        ],
        "stats": [
          { "label": "Species", "value": "347" },
          { "label": "Observers", "value": "24" },
          { "label": "Sightings", "value": "18.4K" }
        ]
      }
    },
    {
      "type": "gallery",
      "data": {
        "title": "Recent Photos",
        "images": [
          { "src": "https://picsum.photos/seed/hawk/400/300", "caption": "Red-tailed Hawk -- North Ridge" },
          { "src": "https://picsum.photos/seed/otter/400/300", "caption": "River Otter -- Willow Creek" },
          { "src": "https://picsum.photos/seed/eagle/400/300", "caption": "Bald Eagle -- Eagle Point" },
          { "src": "https://picsum.photos/seed/bear/400/300", "caption": "Black Bear -- Pine Hollow" },
          { "src": "https://picsum.photos/seed/deer/400/300", "caption": "White-tailed Deer -- Meadow" },
          { "src": "https://picsum.photos/seed/fox/400/300", "caption": "Red Fox -- East Trail" }
        ],
        "columns": 3
      }
    }
  ]
}
```

This skill uses 7 blocks: 3 stat blocks for KPIs, an area chart for trends, a data table for recent sightings, a profile card for the reserve, and a photo gallery.

---

## Step 3: Set up the SvelteKit page

Create a new route in your app. For this example, we will add a page to the showcase app.

### 3a. Create the route directory

```bash
mkdir -p apps/showcase/src/routes/nature
```

### 3b. Create the page

Create `apps/showcase/src/routes/nature/+page.svelte`:

```svelte
<script lang="ts">
  import { ThemeProvider, BlockRenderer } from '@webmcp-auto-ui/ui';
  import themeJson from '../../../theme.json';
  import skillJson from '../../../nature-observatory.skill.json';
</script>

<ThemeProvider defaultMode="light" overrides={themeJson.tokens}>
  <div class="min-h-screen bg-bg p-6">
    <header class="max-w-6xl mx-auto mb-8">
      <h1 class="text-3xl font-bold text-text1">Nature Observatory</h1>
      <p class="text-text2 mt-1">Wildlife sighting dashboard for North Ridge Reserve</p>
    </header>

    <main class="max-w-6xl mx-auto space-y-6">
      <!-- KPI row: 3 stat blocks side by side -->
      <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
        {#each skillJson.blocks.slice(0, 3) as block}
          <BlockRenderer type={block.type} data={block.data} />
        {/each}
      </div>

      <!-- Chart -->
      <BlockRenderer
        type={skillJson.blocks[3].type}
        data={skillJson.blocks[3].data}
      />

      <!-- Data table -->
      <BlockRenderer
        type={skillJson.blocks[4].type}
        data={skillJson.blocks[4].data}
      />

      <!-- Profile + Gallery side by side on desktop -->
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <BlockRenderer
          type={skillJson.blocks[5].type}
          data={skillJson.blocks[5].data}
        />
        <BlockRenderer
          type={skillJson.blocks[6].type}
          data={skillJson.blocks[6].data}
        />
      </div>
    </main>
  </div>
</ThemeProvider>
```

### 3c. Run the dev server

```bash
npm -w apps/showcase run dev
```

Open `http://localhost:5177/nature` in your browser. You should see the full dashboard with the nature theme applied.

---

## Step 4: Add more components

Let us add a map showing sighting locations and a timeline of recent events.

Add these blocks to your skill JSON's `blocks` array:

```json
{
  "type": "map",
  "data": {
    "title": "Sighting Locations",
    "center": { "lat": 35.6, "lng": -83.5 },
    "zoom": 10,
    "markers": [
      { "lat": 35.65, "lng": -83.48, "label": "Red-tailed Hawk" },
      { "lat": 35.58, "lng": -83.52, "label": "River Otter" },
      { "lat": 35.62, "lng": -83.45, "label": "Bald Eagle" },
      { "lat": 35.55, "lng": -83.55, "label": "Black Bear" },
      { "lat": 35.60, "lng": -83.50, "label": "Timber Rattlesnake" }
    ]
  }
}
```

```json
{
  "type": "timeline",
  "data": {
    "title": "Observatory Activity",
    "events": [
      { "date": "2026-04-05", "title": "Hawk nesting confirmed", "description": "Pair of Red-tailed Hawks building nest at North Ridge", "status": "active" },
      { "date": "2026-04-03", "title": "Bear sighting near trail", "description": "Black bear spotted at Pine Hollow, trail advisory issued", "status": "done" },
      { "date": "2026-03-28", "title": "Spring migration begins", "description": "First wave of migratory songbirds arriving at wetland areas", "status": "done" },
      { "date": "2026-03-15", "title": "Sensor network upgraded", "description": "12 new camera traps installed across the southern sector", "status": "done" }
    ]
  }
}
```

Then add them to the page layout:

```svelte
<!-- Map -->
<BlockRenderer
  type={skillJson.blocks[7].type}
  data={skillJson.blocks[7].data}
/>

<!-- Timeline -->
<BlockRenderer
  type={skillJson.blocks[8].type}
  data={skillJson.blocks[8].data}
/>
```

---

## Step 5: Wire the FONC bus between components

FONC (Functions On Named Channels) is the event system built into webmcp-auto-ui. Every block rendered by `BlockRenderer` auto-registers WebMCP tools when `navigator.modelContext` is available. But you can also wire blocks together manually for inter-component communication.

### How it works

Each block rendered via `BlockRenderer` exposes three WebMCP tools:
- `block_<id>_get` -- read the block's current data
- `block_<id>_update` -- update the block's data
- `block_<id>_remove` -- remove the block

To make blocks react to each other, give them explicit IDs and use the update tools:

```svelte
<script lang="ts">
  import { BlockRenderer } from '@webmcp-auto-ui/ui';
  import { onMount } from 'svelte';

  let selectedSpecies = $state('all');
  let tableData = $state(skillJson.blocks[4].data);
  let allRows = skillJson.blocks[4].data.rows;

  function filterBySpecies(species: string) {
    selectedSpecies = species;
    if (species === 'all') {
      tableData = { ...skillJson.blocks[4].data, rows: allRows };
    } else {
      tableData = {
        ...skillJson.blocks[4].data,
        rows: allRows.filter(r => r.species === species)
      };
    }
  }
</script>

<!-- Tags block for filtering -->
<BlockRenderer
  type="tags"
  data={{
    label: "Filter by species",
    tags: [
      { text: "All", active: selectedSpecies === 'all' },
      { text: "Red-tailed Hawk", active: selectedSpecies === 'Red-tailed Hawk' },
      { text: "River Otter", active: selectedSpecies === 'River Otter' },
      { text: "Bald Eagle", active: selectedSpecies === 'Bald Eagle' }
    ]
  }}
  on:tagClick={(e) => filterBySpecies(e.detail.text === 'All' ? 'all' : e.detail.text)}
/>

<!-- Filtered data table -->
<BlockRenderer type="data-table" data={tableData} />
```

This pattern lets you build interactive dashboards where selecting a tag filters the table, clicking a map marker highlights a row, or toggling a stat drills down into the chart.

---

## Step 6: Export as a HyperSkill URL

Once your demo looks right, export it as a portable HyperSkill URL that anyone can open.

The SDK re-exports `encode` and `decode` from the [`hyperskills`](https://www.npmjs.com/package/hyperskills) NPM package:

```typescript
import { encode, decode } from '@webmcp-auto-ui/sdk';

// Encode a skill into a shareable URL
const url = await encode('https://app.example.com/viewer', JSON.stringify(skillData));

// Decode from a URL
const { content } = await decode(url);
const skill = JSON.parse(content);
```

### Using the SDK

```typescript
import { encode } from '@webmcp-auto-ui/sdk';

const skill = {
  version: '1.0',
  name: 'nature-observatory',
  description: 'Wildlife sighting dashboard for North Ridge Reserve',
  theme: themeJson.tokens,
  blocks: skillJson.blocks
};

const shareUrl = await encode('https://demos.hyperskills.net/viewer', JSON.stringify(skill));

console.log(shareUrl);
// Copy this URL -- anyone who opens it will see the full themed dashboard
```

### Using the Flex app

1. Open Flex at `http://localhost:5179`
2. Import the skill JSON via the HyperSkill URL (`?hs=...`)
3. Click "Export" and copy the generated URL
4. The URL contains the theme + all blocks, base64-encoded (gzip-compressed if > 6 KB)

### How the URL works

```
https://demos.hyperskills.net/viewer?hs=eyJ2ZXJzaW9uIjoiMS4wI...

                                        ^^^^^^^^^^^^^^^^^^^^^^^^^
                                        base64(JSON.stringify(skill))
                                        or gz.base64(gzip(JSON.stringify(skill)))
                                        if the payload exceeds 6 KB
```

When someone opens the URL:
1. The Viewer reads the `hs` query parameter
2. Decodes base64 (decompresses gzip if `gz.` prefix)
3. Parses the JSON skill object
4. ThemeProvider applies the embedded `theme` tokens
5. BlockRenderer renders each block in sequence

---

## Step 7: Deploy the demo

Follow the [Deploy tutorial](./deploy.md) to push your demo to production. For a quick deploy of just the showcase app:

```bash
./scripts/deploy.sh showcase
```

The deploy script handles building packages, building the app, cleaning old files, copying to the correct path, and verifying integrity.

Your themed demo is now live at `https://demos.hyperskills.net/showcase/nature`.

---

## Complete page listing

Here is the full `+page.svelte` file for reference:

```svelte
<script lang="ts">
  import { ThemeProvider, BlockRenderer } from '@webmcp-auto-ui/ui';
  import themeJson from '../../../theme.json';
  import skillJson from '../../../nature-observatory.skill.json';
</script>

<ThemeProvider defaultMode="light" overrides={themeJson.tokens}>
  <div class="min-h-screen bg-bg p-6">
    <header class="max-w-6xl mx-auto mb-8">
      <h1 class="text-3xl font-bold text-text1">Nature Observatory</h1>
      <p class="text-text2 mt-1">Wildlife sighting dashboard for North Ridge Reserve</p>
    </header>

    <main class="max-w-6xl mx-auto space-y-6">
      <!-- KPI stats -->
      <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
        {#each skillJson.blocks.slice(0, 3) as block}
          <BlockRenderer type={block.type} data={block.data} />
        {/each}
      </div>

      <!-- Sightings chart -->
      <BlockRenderer type={skillJson.blocks[3].type} data={skillJson.blocks[3].data} />

      <!-- Recent sightings table -->
      <BlockRenderer type={skillJson.blocks[4].type} data={skillJson.blocks[4].data} />

      <!-- Reserve profile + photo gallery -->
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <BlockRenderer type={skillJson.blocks[5].type} data={skillJson.blocks[5].data} />
        <BlockRenderer type={skillJson.blocks[6].type} data={skillJson.blocks[6].data} />
      </div>

      <!-- Sighting map -->
      <BlockRenderer type={skillJson.blocks[7].type} data={skillJson.blocks[7].data} />

      <!-- Activity timeline -->
      <BlockRenderer type={skillJson.blocks[8].type} data={skillJson.blocks[8].data} />
    </main>
  </div>
</ThemeProvider>
```

## Summary

What we built:
1. A nature-themed color palette in `theme.json`
2. A skill recipe with 9 blocks (stats, chart, table, profile, gallery, map, timeline)
3. A SvelteKit page with `ThemeProvider` and `BlockRenderer`
4. Interactive filtering via the FONC event bus
5. A shareable HyperSkill URL
6. A production deployment

The same pattern works for any theme and any combination of the 24 available block types. Change the colors in `theme.json`, swap out the blocks, and you have a completely different dashboard.

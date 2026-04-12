# Meta-recipe: Mars Rover Dashboard

A concrete scenario that fetches the latest Curiosity photos, displays them in a gallery, adds stat cards for camera distribution, and charts photos by sol.

## Step 1 -- Fetch latest Curiosity photos

**User prompt:**
> Show me the latest photos from the Curiosity rover on Mars.

**Expected tool calls:**

```
Tool: nasa_mars_rover
Args: { "rover": "curiosity", "sol": 4100 }
```

(The agent picks a recent sol number. If no photos are returned, it decrements and retries.)

**Agent behavior:**
The agent calls `nasa_mars_rover` with the Curiosity rover and a recent sol. The API returns an array of photo objects. The agent renders them as an image gallery using the `nasa-mars-rover` recipe, showing `img_src` with captions containing camera name and earth date.

**Sample gallery output:**

- Front Hazard Avoidance Camera -- 2026-04-10, Sol 4100 -- [image]
- Navigation Camera -- 2026-04-10, Sol 4100 -- [image]
- Mast Camera -- 2026-04-10, Sol 4100 -- [image]

## Step 2 -- Camera distribution stats

**User prompt:**
> How many photos per camera? Show me stat cards.

**Expected tool calls:**

No additional API calls needed -- the agent aggregates from the data already fetched in step 1.

**Agent behavior:**
The agent groups photos by `camera.name` and renders KPI-style stat cards:

```
+------------------+    +------------------+    +------------------+
| FHAZ             |    | NAVCAM           |    | MAST             |
| 24 photos        |    | 18 photos        |    | 42 photos        |
| Front Hazard     |    | Navigation       |    | Mast Camera      |
| Avoidance Camera |    | Camera           |    |                  |
+------------------+    +------------------+    +------------------+
```

## Step 3 -- Photos by sol chart

**User prompt:**
> Show me a chart of how many photos Curiosity took over the last 10 sols.

**Expected tool calls:**

```
Tool: nasa_mars_rover
Args: { "rover": "curiosity", "sol": 4091 }

Tool: nasa_mars_rover
Args: { "rover": "curiosity", "sol": 4092 }

... (up to sol 4100)
```

**Agent behavior:**
The agent fetches photo counts for each sol in the range and renders a bar chart showing photo volume over time. Sols with zero photos (rover idle or data not yet downlinked) appear as zero-height bars.

**Sample chart data:**

| Sol | Photos |
|-----|--------|
| 4091 | 34 |
| 4092 | 0 |
| 4093 | 67 |
| 4094 | 45 |
| ... | ... |

## Combined dashboard

**User prompt:**
> Build me a full Mars Rover dashboard: latest Curiosity photos in a gallery, camera stats, and a photo-count chart for the last 10 sols.

**Expected tool calls:**

```
Tool: nasa_mars_rover
Args: { "rover": "curiosity", "sol": 4100 }
```

Plus 9 additional calls for sols 4091-4099.

**Agent behavior:**
1. Fetch sol 4100 photos -- render gallery (`nasa-mars-rover` recipe)
2. Aggregate by camera -- render stat cards (`nasa-neo-dashboard` recipe adapted for KPI display)
3. Fetch sols 4091-4099 -- render bar chart of photo counts per sol

All three sections compose into a single dashboard view.

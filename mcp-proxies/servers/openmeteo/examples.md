# Open-Meteo Examples

## Meta-recipe: Weather Comparison for 3 Cities

Compare weather in Paris, Lyon, and Marseille with stat cards for current temperatures, a 7-day forecast chart, and a map showing all three locations.

### Step 1 -- Geocode the three cities

User prompt:
> Compare the weather in Paris, Lyon and Marseille

Expected tool calls (3 sequential or parallel):
```json
{
  "tool": "geocoding",
  "arguments": { "name": "Paris", "count": 1 }
}
```
```json
{
  "tool": "geocoding",
  "arguments": { "name": "Lyon", "count": 1 }
}
```
```json
{
  "tool": "geocoding",
  "arguments": { "name": "Marseille", "count": 1 }
}
```

### Step 2 -- Fetch current weather + 7-day forecast for each city

Expected tool calls (one per city):
```json
{
  "tool": "weather_forecast",
  "arguments": {
    "latitude": 48.8566,
    "longitude": 2.3522,
    "current_weather": true,
    "daily": ["temperature_2m_max", "temperature_2m_min", "precipitation_sum"],
    "forecast_days": 7,
    "timezone": "Europe/Paris"
  }
}
```

Repeat for Lyon (45.7640, 4.8357) and Marseille (43.2965, 5.3698).

### Step 3 -- Render stat cards

The agent uses the `meteo-summary-kpi` recipe pattern to render one stat card per city showing:
- Current temperature
- Wind speed and direction
- Weather condition (decoded from weather code)

### Step 4 -- Render 7-day forecast chart

The agent uses the `meteo-forecast-chart` recipe pattern to create a line chart with:
- X axis: dates (7 days)
- Y axis: temperature range (min/max) for each city
- Optional bars for precipitation

### Step 5 -- Render location map

The agent uses the `meteo-location-map` recipe pattern to plot the three cities on a map with markers. Each marker popup shows current temperature and conditions.

### Combined prompt

> Show me the current weather in Paris, Lyon and Marseille as stat cards, then chart the 7-day forecast for all three, and put them on a map.

This triggers all three recipe patterns in sequence using the same dataset.

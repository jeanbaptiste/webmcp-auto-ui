---
id: visualize-weather-forecasts-with-charts-and-kpis
name: Visualize weather forecasts with time series charts and key indicators
components_used: [stat-card, chart-rich, map, kv]
when: MCP data contains weather measurements (temperature, humidity, wind, precipitation) or hourly/daily forecasts
servers: [openmeteo]
layout:
  type: grid
  columns: 2
  arrangement: stat-cards at the top, chart spanning full width at the bottom
---

## When to use

MCP results contain structured weather data. Typically:
- **Open-Meteo**: hourly forecasts (`hourly.temperature_2m`, `hourly.precipitation`), daily forecasts (`daily.temperature_2m_max/min`), current conditions (`current.temperature_2m`, `current.wind_speed_10m`)
- Any source returning time series of climate measurements

This recipe applies even for a single city: stat-cards show current conditions, the chart shows the trend over time.

## How to use

1. **Call the weather tool** with coordinates or city name:
   - Open-Meteo: `get_forecast({latitude: 48.85, longitude: 2.35, hourly: "temperature_2m,precipitation", daily: "temperature_2m_max,temperature_2m_min"})`
2. **Extract current KPIs** and display them as stat-cards:
   - Current temperature: `component("stat-card", {label: "Temperature", value: "18.5°C", icon: "thermometer"})`
   - Wind: `component("stat-card", {label: "Wind", value: "12.3 km/h", icon: "wind"})`
   - Humidity: `component("stat-card", {label: "Humidity", value: "72%", icon: "droplets"})`
   - Precipitation: `component("stat-card", {label: "Rain (24h)", value: "2.1 mm", icon: "cloud-rain"})`
3. **Build the time series chart** from hourly or daily series:
   - `component("chart-rich", {type: "line", labels: hourly.time, datasets: [{label: "Temperature °C", data: hourly.temperature_2m}]})`
   - For precipitation, prefer an overlaid "bar" type
4. **Add the map** if coordinates are available:
   - `component("map", {center: [lat, lon], zoom: 10, markers: [{lat, lon, label: "Paris"}]})`
5. **Complete with details** in kv:
   - `component("kv", {pairs: [["Sunrise", "06:42"], ["Sunset", "20:15"], ["UV Index", "5 (moderate)"]]})`

## Examples

### 7-day forecast for Paris
```
// MCP call
get_forecast({latitude: 48.8566, longitude: 2.3522, daily: "temperature_2m_max,temperature_2m_min,precipitation_sum"})

// Render
component("stat-card", {label: "Today", value: "22°C / 14°C", icon: "thermometer"})
component("stat-card", {label: "Expected rain", value: "0 mm", icon: "sun"})
component("chart-rich", {
  type: "line",
  labels: daily.time,  // ["2026-04-09", "2026-04-10", ...]
  datasets: [
    {label: "Max °C", data: daily.temperature_2m_max},
    {label: "Min °C", data: daily.temperature_2m_min}
  ]
})
```

### Hourly forecast with precipitation
```
component("chart-rich", {
  type: "line",
  labels: hourly.time.slice(0, 24),
  datasets: [
    {label: "Temperature °C", data: hourly.temperature_2m.slice(0, 24), yAxisID: "y"},
    {label: "Rain mm", data: hourly.precipitation.slice(0, 24), yAxisID: "y1", type: "bar"}
  ]
})
```

## Common mistakes

- **Displaying raw JSON data** instead of visualizing it with components
- **Not converting units**: Open-Meteo returns SI units by default (m/s for wind → convert to km/h if appropriate for the user)
- **Forgetting stat-cards** for the main KPIs: a chart alone does not surface key figures immediately
- **Too many points on the chart**: for hourly forecasts over 7 days (168 points), prefer daily resampling or limit to 48h in hourly mode

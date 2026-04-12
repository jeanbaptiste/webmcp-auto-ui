# Open-Meteo MCP Server

MCP proxy server for Open-Meteo, a free weather API providing forecast and historical weather data worldwide.

## Architecture

Uses the `open-meteo-mcp` npm package, launched via `npx`. No local bridge script needed.

## Available Tools

### weather_forecast

Fetch weather forecast data for a given latitude/longitude.

Parameters:
- `latitude` (number) -- Location latitude
- `longitude` (number) -- Location longitude
- `hourly` (string[]) -- Hourly variables to include (e.g. "temperature_2m", "precipitation", "wind_speed_10m", "relative_humidity_2m", "weather_code")
- `daily` (string[]) -- Daily variables to include (e.g. "temperature_2m_max", "temperature_2m_min", "precipitation_sum")
- `current_weather` (boolean) -- Include current conditions snapshot
- `forecast_days` (number) -- Number of forecast days (1-16, default 7)
- `timezone` (string) -- Timezone for time values (e.g. "Europe/Paris")

### geocoding

Resolve place names to geographic coordinates.

Parameters:
- `name` (string) -- Place name to search for
- `count` (number) -- Number of results (default 1)
- `language` (string) -- Response language (e.g. "en", "fr")

Returns: `{latitude, longitude, name, country, elevation, timezone}`

## Authentication

No API key required. Open-Meteo provides free access for non-commercial use with up to 10,000 requests per day.

## Data Notes

- Temperature values are in Celsius by default
- Wind speed is in km/h by default
- Precipitation is in mm
- Weather codes follow the WMO standard (0 = clear, 1-3 = partly cloudy, etc.)

# data.gouv.fr Examples

## Meta-recipe: French Open Data

Search for transport datasets on data.gouv.fr and display results in a table.

### Step 1 -- Search for transport datasets

User prompt:
> Find open datasets about public transport in France

Expected tool call (tool names depend on the remote server's current definitions):
```json
{
  "tool": "search_datasets",
  "arguments": {
    "query": "transports en commun"
  }
}
```

Returns a list of datasets with metadata: title, description, organization, last update date, number of resources, license, and URL.

### Step 2 -- Display results as a table

The agent renders the dataset list as a data table with columns:
- Dataset title
- Publishing organization
- Last updated date
- Number of resources (files)
- License type

Each row links to the dataset page on data.gouv.fr.

### Step 3 -- Drill into a specific dataset

The user clicks or asks about a specific dataset.

Expected tool call:
```json
{
  "tool": "get_dataset",
  "arguments": {
    "dataset_id": "some-dataset-id"
  }
}
```

Returns full metadata including the list of downloadable resources (CSV, JSON, GeoJSON, etc.).

### Combined prompt

> Search data.gouv.fr for public transport datasets, show me the results in a table, then show the details and resources for the most relevant one.

### Notes

Since datagouv is a CORS proxy to the remote `mcp.data.gouv.fr` server, tool names and schemas may change as the government updates their MCP server. The examples above reflect the expected API shape but should be validated against the live server.

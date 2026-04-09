// Recipe types — WebMCP UI recipes

export interface Recipe {
  id: string;
  name: string;
  description?: string;
  components_used?: string[];
  layout?: { type: string; columns?: number; arrangement?: string };
  example_data?: Record<string, unknown>;
  interactions?: { source: string; target: string; event: string; action: string }[];
  when: string;
  servers?: string[];
  body: string;
}

export interface McpRecipe {
  name: string;
  description?: string;
}

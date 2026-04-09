// Recipe loader — imports auto-generated .md strings, parses them, exports ready-to-use recipes

export type { Recipe, McpRecipe } from './types.js';
export { parseRecipe, parseRecipes } from './parser.js';

import { RAW_RECIPES } from './_generated.js';
import { parseRecipes } from './parser.js';
import { registerRecipes } from '../recipe-registry.js';

/** All built-in WebMCP UI recipes, parsed and ready to use */
export const WEBMCP_RECIPES = parseRecipes(RAW_RECIPES);

// Auto-populate the registry with built-in recipes
registerRecipes(WEBMCP_RECIPES);

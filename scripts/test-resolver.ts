// Standalone test — inline the resolver logic to avoid workspace imports

type CanonicalRole = 'search_recipes' | 'get_recipe';
interface CanonicalMatch { role: CanonicalRole; realToolName: string; }
interface McpToolDef { name: string; description?: string; }

const SEARCH_ACTIONS = ['search', 'list', 'find', 'browse', 'discover', 'query', 'explore'];
const GET_ACTIONS = ['get', 'read', 'fetch', 'show', 'describe', 'detail', 'view', 'load'];
const RESOURCE_A = ['recipe', 'recipes', 'skill', 'skills'];
const RESOURCE_B = ['template', 'templates', 'prompt', 'prompts', 'workflow', 'workflows',
  'playbook', 'playbooks', 'pattern', 'patterns', 'example', 'examples'];
const ALL_RESOURCES = [...RESOURCE_A, ...RESOURCE_B];
const DESC_KEYWORDS = ['recipe', 'skill', 'template', 'workflow', 'playbook'];

function tokenize(name: string): string[] {
  return name.replace(/([a-z])([A-Z])/g, '$1_$2').replace(/-/g, '_').toLowerCase().split('_').filter(Boolean);
}

function matchRole(action: string, resource: string): CanonicalRole | null {
  const isSearch = SEARCH_ACTIONS.includes(action);
  const isGet = GET_ACTIONS.includes(action);
  if (!isSearch && !isGet) return null;
  if (!ALL_RESOURCES.includes(resource)) return null;
  return isSearch ? 'search_recipes' : 'get_recipe';
}

function resolveCanonicalTools(tools: McpToolDef[]): CanonicalMatch[] {
  const found = new Map<CanonicalRole, CanonicalMatch>();

  // Layer 1 — Exact match
  for (const t of tools) {
    if (t.name === 'search_recipes' && !found.has('search_recipes'))
      found.set('search_recipes', { role: 'search_recipes', realToolName: t.name });
    if (t.name === 'get_recipe' && !found.has('get_recipe'))
      found.set('get_recipe', { role: 'get_recipe', realToolName: t.name });
    if (found.size === 2) return Array.from(found.values());
  }

  // Layer 2 — Action×Resource decomposition
  for (const t of tools) {
    const tokens = tokenize(t.name);
    if (tokens.length < 2) continue;
    for (let i = 0; i < tokens.length - 1; i++) {
      const role = matchRole(tokens[i], tokens[i + 1]);
      if (role && !found.has(role))
        found.set(role, { role, realToolName: t.name });
    }
    if (found.size === 2) return Array.from(found.values());
  }

  // Layer 3 — Description scan
  for (const t of tools) {
    if (!t.description) continue;
    const desc = t.description.toLowerCase();
    const hasKeyword = DESC_KEYWORDS.some(k => desc.includes(k));
    if (!hasKeyword) continue;
    const tokens = tokenize(t.name);
    const action = tokens[0];
    if (SEARCH_ACTIONS.includes(action) && !found.has('search_recipes'))
      found.set('search_recipes', { role: 'search_recipes', realToolName: t.name });
    else if (GET_ACTIONS.includes(action) && !found.has('get_recipe'))
      found.set('get_recipe', { role: 'get_recipe', realToolName: t.name });
    if (found.size === 2) return Array.from(found.values());
  }

  return Array.from(found.values());
}

// ── Test harness ──

let pass = 0, fail = 0;

function test(name: string, tools: McpToolDef[], expected: { search?: string; get?: string }) {
  const matches = resolveCanonicalTools(tools);
  const search = matches.find(m => m.role === 'search_recipes')?.realToolName ?? null;
  const get = matches.find(m => m.role === 'get_recipe')?.realToolName ?? null;
  const ok = (search === (expected.search ?? null)) && (get === (expected.get ?? null));
  if (ok) { pass++; } else { fail++; }
  console.log(`${ok ? '✅' : '❌'} ${name}`);
  if (!ok) {
    console.log(`   expected: search=${expected.search ?? 'null'}, get=${expected.get ?? 'null'}`);
    console.log(`   got:      search=${search}, get=${get}`);
  }
}

console.log('━━━ Layer 1 — Exact match ━━━\n');

test('exact match both', [
  { name: 'search_recipes', description: 'Search recipes' },
  { name: 'get_recipe', description: 'Get a recipe' },
  { name: 'query_sql', description: 'Run SQL' },
], { search: 'search_recipes', get: 'get_recipe' });

test('only search_recipes', [
  { name: 'search_recipes', description: 'Search' },
  { name: 'query_sql', description: 'SQL' },
], { search: 'search_recipes' });

test('only get_recipe', [
  { name: 'get_recipe', description: 'Get' },
  { name: 'query_sql', description: 'SQL' },
], { get: 'get_recipe' });

console.log('\n━━━ Layer 2 — Action×Resource ━━━\n');

test('list_skills + get_skill', [
  { name: 'list_skills', description: '' },
  { name: 'get_skill', description: '' },
  { name: 'run_task', description: '' },
], { search: 'list_skills', get: 'get_skill' });

test('find_templates + read_template', [
  { name: 'find_templates', description: '' },
  { name: 'read_template', description: '' },
], { search: 'find_templates', get: 'read_template' });

test('browse_workflows + fetch_workflow', [
  { name: 'browse_workflows', description: '' },
  { name: 'fetch_workflow', description: '' },
], { search: 'browse_workflows', get: 'fetch_workflow' });

test('list_recipes (decomposition, not exact)', [
  { name: 'list_recipes', description: '' },
  { name: 'get_recipe', description: '' },
], { search: 'list_recipes', get: 'get_recipe' });

test('explore_playbooks + load_playbook', [
  { name: 'explore_playbooks', description: '' },
  { name: 'load_playbook', description: '' },
], { search: 'explore_playbooks', get: 'load_playbook' });

test('discover_examples + view_example', [
  { name: 'discover_examples', description: '' },
  { name: 'view_example', description: '' },
], { search: 'discover_examples', get: 'view_example' });

test('camelCase: searchSkills + getSkill', [
  { name: 'searchSkills', description: '' },
  { name: 'getSkill', description: '' },
], { search: 'searchSkills', get: 'getSkill' });

console.log('\n━━━ Layer 3 — Description scan ━━━\n');

test('generic name, recipe in description', [
  { name: 'search', description: 'Search available recipes and skills' },
  { name: 'get_details', description: 'Get details about a recipe' },
  { name: 'query_sql', description: 'Run SQL queries' },
], { search: 'search', get: 'get_details' });

test('generic name, skill in description', [
  { name: 'list_all', description: 'List all available skills for this server' },
  { name: 'read_one', description: 'Read a single skill by name' },
], { search: 'list_all', get: 'read_one' });

console.log('\n━━━ Layer 4 — No match (fallback) ━━━\n');

test('no recipe tools at all', [
  { name: 'query_sql', description: 'Run SQL' },
  { name: 'list_tables', description: 'List tables' },
  { name: 'describe_table', description: 'Describe a table' },
], {});

test('empty tool list', [], {});

console.log('\n━━━ Real-world servers ━━━\n');

test('code4code (exact)', [
  { name: 'search_recipes', description: 'Search recipes' },
  { name: 'get_recipe', description: 'Get recipe details' },
  { name: 'query_sql', description: 'SQL query' },
  { name: 'list_tables', description: 'List tables' },
  { name: 'describe_table', description: 'Describe table' },
], { search: 'search_recipes', get: 'get_recipe' });

test('hypothetical PlayMCP with skills', [
  { name: 'list_skills', description: 'List game skills' },
  { name: 'get_skill', description: 'Get skill instructions' },
  { name: 'play_game', description: 'Start a game' },
  { name: 'submit_answer', description: 'Submit an answer' },
], { search: 'list_skills', get: 'get_skill' });

test('hypothetical AI server with prompts', [
  { name: 'search_prompts', description: 'Find prompt templates' },
  { name: 'get_prompt', description: 'Load a prompt by name' },
  { name: 'run_inference', description: 'Run inference' },
], { search: 'search_prompts', get: 'get_prompt' });

// ── Alias demo ──
console.log('\n━━━ Alias demo ━━━\n');

const aliasMap = new Map<string, string>();
const layers = [
  { serverName: 'tricoteuses', tools: [
    { name: 'search_recipes', description: '' },
    { name: 'get_recipe', description: '' },
  ]},
  { serverName: 'gameserver', tools: [
    { name: 'list_skills', description: '' },
    { name: 'get_skill', description: '' },
  ]},
  { serverName: 'rawdb', tools: [
    { name: 'query', description: 'Query data' },
    { name: 'list_tables', description: 'List tables' },
  ]},
];

for (const l of layers) {
  const matches = resolveCanonicalTools(l.tools);
  const prefix = `${l.serverName}_mcp_`;
  for (const m of matches) {
    const canonical = `${prefix}${m.role}`;
    const real = `${prefix}${m.realToolName}`;
    if (m.role !== m.realToolName) aliasMap.set(canonical, real);
    console.log(`  prompt: ${canonical}()${m.role !== m.realToolName ? `  →  dispatch: ${real}()` : '  (no alias needed)'}`);
  }
  if (matches.length === 0) {
    console.log(`  ${l.serverName}: no recipe tools → fallback: ${l.tools.map(t => t.name).join(', ')}`);
  }
}

console.log(`\n  Alias map entries: ${aliasMap.size}`);
for (const [k, v] of aliasMap) console.log(`    ${k}  →  ${v}`);

// ── Summary ──
console.log(`\n━━━ Results: ${pass} passed, ${fail} failed ━━━`);
process.exit(fail > 0 ? 1 : 0);

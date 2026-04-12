var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// scripts/generate-docs.ts
var import_sdk = __toESM(require("@anthropic-ai/sdk"));
var import_fs = require("fs");
var import_path = require("path");
var import_meta = {};
var ROOT = (0, import_path.join)(new URL(".", import_meta.url).pathname, "..");
var DOCS_FR = (0, import_path.join)(ROOT, "docs-site/src/content/docs/fr");
var DOCS_EN = (0, import_path.join)(ROOT, "docs-site/src/content/docs/en");
var DRY_RUN = process.argv.includes("--dry-run");
var MODEL = "claude-haiku-4-5-20251001";
var SOURCE_FILES = [
  "packages/agent/src/loop.ts",
  "packages/agent/src/tool-layers.ts",
  "packages/agent/src/autoui-server.ts",
  "packages/agent/src/types.ts",
  "packages/agent/src/index.ts",
  "packages/core/src/webmcp-server.ts",
  "packages/core/src/types.ts",
  "packages/core/src/index.ts",
  "packages/ui/src/widgets/WidgetRenderer.svelte",
  "packages/ui/src/widgets/SafeImage.svelte",
  "packages/ui/src/widgets/LinkOverlay.svelte",
  "packages/ui/src/messaging/bus.svelte.ts",
  "packages/ui/src/index.ts",
  "packages/sdk/src/stores/canvas.svelte.ts",
  "packages/sdk/src/stores/canvas.ts",
  "packages/sdk/src/index.ts",
  "CLAUDE.md"
];
var OUTPUT_FILES = {
  fr: [
    "index.mdx",
    "guide/getting-started.mdx",
    "guide/architecture.mdx",
    "guide/tool-calling.mdx",
    "guide/deploy.mdx",
    "packages/agent.mdx",
    "packages/ui.mdx",
    "packages/sdk.mdx",
    "packages/core.mdx",
    "tutorials/create-custom-widget.mdx",
    "tutorials/use-existing-widgets.mdx",
    "tutorials/connect-mcp-server.mdx"
  ],
  en: [
    "index.mdx",
    "guide/getting-started.mdx",
    "guide/architecture.mdx",
    "guide/tool-calling.mdx",
    "guide/deploy.mdx",
    "packages/agent.mdx",
    "packages/ui.mdx",
    "packages/sdk.mdx",
    "packages/core.mdx",
    "tutorials/create-custom-widget.mdx",
    "tutorials/use-existing-widgets.mdx",
    "tutorials/connect-mcp-server.mdx"
  ]
};
function readSources() {
  const parts = [];
  for (const f of SOURCE_FILES) {
    const abs = (0, import_path.join)(ROOT, f);
    try {
      const content = (0, import_fs.readFileSync)(abs, "utf-8");
      parts.push(`### ${f}
\`\`\`ts
${content}
\`\`\``);
    } catch {
    }
  }
  return parts.join("\n\n");
}
function writeDoc(base, relativePath, content) {
  const abs = (0, import_path.join)(base, relativePath);
  (0, import_fs.mkdirSync)((0, import_path.dirname)(abs), { recursive: true });
  (0, import_fs.writeFileSync)(abs, content, "utf-8");
  console.log(`  wrote ${relativePath}`);
}
function parseFiles(response) {
  const files = {};
  const regex = /=== FILE: (.+?) ===\n([\s\S]*?)(?==== END FILE ===|=== FILE:|$)/g;
  let match;
  while ((match = regex.exec(response)) !== null) {
    const path = match[1].trim();
    const content = match[2].trimEnd() + "\n";
    files[path] = content;
  }
  return files;
}
async function callClaude(client, systemPrompt, userPrompt, label) {
  console.log(`
  [${label}] Calling Claude (${MODEL})...`);
  const start = Date.now();
  const response = await client.messages.create({
    model: MODEL,
    max_tokens: 16e3,
    messages: [{ role: "user", content: userPrompt }],
    system: systemPrompt
  });
  const text = response.content.filter((b) => b.type === "text").map((b) => b.text).join("");
  const elapsed = ((Date.now() - start) / 1e3).toFixed(1);
  const tokens = response.usage;
  console.log(
    `  [${label}] Done in ${elapsed}s (input: ${tokens.input_tokens}, output: ${tokens.output_tokens})`
  );
  return text;
}
var SYSTEM_PROMPT = `Tu es un r\xE9dacteur de documentation technique expert. Tu g\xE9n\xE8res des fichiers .mdx pour Starlight (Astro).

R\xE8gles :
- Chaque fichier commence par un frontmatter YAML avec : title, description, sidebar (avec order)
- Les diagrammes d'architecture utilisent des blocs \`\`\`mermaid
- Les exemples de code sont concrets, extraits ou inspir\xE9s du code r\xE9el fourni
- Le ton est technique mais accessible
- Tu utilises le format de sortie multi-fichiers :
  === FILE: chemin/relatif.mdx ===
  <contenu du fichier>
  === END FILE ===
- Ne g\xE9n\xE8re RIEN en dehors de ce format (pas de commentaire avant/apr\xE8s)`;
function promptOverviewAndGuide(sources) {
  return `Voici le code source du projet WebMCP Auto-UI :

${sources}

G\xE9n\xE8re les fichiers suivants en FRAN\xC7AIS :

1. **index.mdx** \u2014 Page d'accueil : overview du projet WebMCP Auto-UI (syst\xE8me d'auto-g\xE9n\xE9ration d'UI par agents IA via MCP). Sidebar order: 0.

2. **guide/getting-started.mdx** \u2014 Quickstart pour un d\xE9veloppeur : installation, configuration, premier lancement. Sidebar order: 1.

3. **guide/architecture.mdx** \u2014 Architecture compl\xE8te du syst\xE8me : MCP, agent loop, tool layers, component registry, canvas. Inclure au moins 2 diagrammes Mermaid (un pour l'architecture globale, un pour le flow agent). Sidebar order: 2.

4. **guide/tool-calling.mdx** \u2014 Comment fonctionne le tool calling : tool layers, component tool, UI tools, skill executor. Sidebar order: 3.

5. **guide/deploy.mdx** \u2014 Comment d\xE9ployer les apps (utilisation de scripts/deploy.sh, chemins par app, contraintes). Sidebar order: 4.

Utilise le format === FILE: ... === pour chaque fichier.`;
}
function promptPackages(sources) {
  return `Voici le code source du projet WebMCP Auto-UI :

${sources}

G\xE9n\xE8re les fichiers suivants en FRAN\xC7AIS \u2014 documentation API de r\xE9f\xE9rence pour chaque package :

1. **packages/agent.mdx** \u2014 Package @webmcp-auto-ui/agent : agent loop (runAgentLoop), providers (Anthropic, Gemma WASM), tool layers, component tool, skill executor, token tracker. Liste tous les exports publics avec leur signature et une description. Sidebar order: 1.

2. **packages/ui.mdx** \u2014 Package @webmcp-auto-ui/ui : BlockRenderer, LLMSelector, GemmaLoader, McpStatus, AgentProgress. Montre comment utiliser chaque composant Svelte avec des exemples. Sidebar order: 2.

3. **packages/sdk.mdx** \u2014 Package @webmcp-auto-ui/sdk : canvas store, HyperSkill encode/decode/hash/diff/getHsParam. D\xE9taille l'API du store canvas et les fonctions utilitaires. Sidebar order: 3.

4. **packages/core.mdx** \u2014 Package @webmcp-auto-ui/core : McpClient, createToolGroup, types, events. D\xE9taille l'API client MCP et les helpers. Sidebar order: 4.

Utilise le format === FILE: ... === pour chaque fichier.`;
}
function promptTutorials(sources) {
  return `Voici le code source du projet WebMCP Auto-UI :

${sources}

G\xE9n\xE8re les fichiers suivants en FRAN\xC7AIS \u2014 tutorials pas-\xE0-pas :

1. **tutorials/create-custom-widget.mdx** \u2014 Tutorial : cr\xE9er un widget custom pour le syst\xE8me de composants. Montre comment enregistrer un nouveau composant dans le registry, le rendre via BlockRenderer, et le connecter au canvas. Sidebar order: 1.

2. **tutorials/use-existing-widgets.mdx** \u2014 Tutorial : utiliser les widgets existants (BlockRenderer avec les types de blocs simple et rich). Montre des exemples concrets d'utilisation dans une app Svelte. Sidebar order: 2.

3. **tutorials/connect-mcp-server.mdx** \u2014 Tutorial : connecter un serveur MCP externe. Montre comment utiliser McpClient, configurer les tool groups, et int\xE9grer avec l'agent loop. Sidebar order: 3.

Utilise le format === FILE: ... === pour chaque fichier.`;
}
function promptTranslate(frenchDocs) {
  const docsList = Object.entries(frenchDocs).map(([path, content]) => `=== FILE: ${path} ===
${content}
=== END FILE ===`).join("\n\n");
  return `Traduis ces fichiers de documentation technique du fran\xE7ais vers l'anglais.
Conserve exactement :
- Le frontmatter YAML (traduis title et description)
- La structure Markdown/MDX
- Les blocs de code (ne traduis PAS le code, seulement les commentaires)
- Les diagrammes Mermaid (traduis les labels)
- Le format de sortie === FILE: ... ===

Voici les fichiers :

${docsList}

G\xE9n\xE8re les fichiers traduits avec les m\xEAmes chemins relatifs.`;
}
async function main() {
  console.log("WebMCP Auto-UI \u2014 Documentation Generator\n");
  if (DRY_RUN) {
    console.log("DRY RUN \u2014 files that would be generated:\n");
    for (const [locale, files] of Object.entries(OUTPUT_FILES)) {
      const base = locale === "fr" ? DOCS_FR : DOCS_EN;
      for (const f of files) {
        console.log(`  ${(0, import_path.join)(base, f)}`);
      }
    }
    console.log(`
Total: ${OUTPUT_FILES.fr.length + OUTPUT_FILES.en.length} files`);
    console.log("Source files that would be read:");
    for (const f of SOURCE_FILES) {
      const exists = (0, import_fs.existsSync)((0, import_path.join)(ROOT, f));
      console.log(`  ${exists ? "\u2713" : "\u2717"} ${f}`);
    }
    return;
  }
  if (!process.env.ANTHROPIC_API_KEY) {
    console.warn(
      "WARNING: ANTHROPIC_API_KEY not set \u2014 skipping doc generation.\nSet it before running: export ANTHROPIC_API_KEY=sk-ant-...\nOr use --dry-run to preview without calling the API.\nThe Starlight site will build with existing docs."
    );
    return;
  }
  const client = new import_sdk.default({ timeout: 6e5 });
  const sources = readSources();
  console.log(`Read ${SOURCE_FILES.length} source files as context.`);
  for (const dir of [DOCS_FR, DOCS_EN]) {
    for (const sub of ["guide", "packages", "tutorials"]) {
      const target = (0, import_path.join)(dir, sub);
      if ((0, import_fs.existsSync)(target)) {
        (0, import_fs.rmSync)(target, { recursive: true });
        console.log(`  cleaned ${target}`);
      }
    }
    for (const ext of ["mdx", "md"]) {
      const idx = (0, import_path.join)(dir, `index.${ext}`);
      if ((0, import_fs.existsSync)(idx)) {
        (0, import_fs.rmSync)(idx);
        console.log(`  cleaned ${idx}`);
      }
    }
  }
  console.log("\n--- Batch 1: Overview & Guide (FR) ---");
  const guideRaw = await callClaude(
    client,
    SYSTEM_PROMPT,
    promptOverviewAndGuide(sources),
    "guide"
  );
  const guideFiles = parseFiles(guideRaw);
  console.log("\n--- Batch 2: Packages API Reference (FR) ---");
  const pkgRaw = await callClaude(client, SYSTEM_PROMPT, promptPackages(sources), "packages");
  const pkgFiles = parseFiles(pkgRaw);
  console.log("\n--- Batch 3: Tutorials (FR) ---");
  const tutRaw = await callClaude(client, SYSTEM_PROMPT, promptTutorials(sources), "tutorials");
  const tutFiles = parseFiles(tutRaw);
  const allFrFiles = { ...guideFiles, ...pkgFiles, ...tutFiles };
  console.log("\n--- Writing FR docs ---");
  for (const [path, content] of Object.entries(allFrFiles)) {
    writeDoc(DOCS_FR, path, content);
  }
  console.log("\n--- Batch 4: Translation to English ---");
  const enRaw = await callClaude(
    client,
    SYSTEM_PROMPT,
    promptTranslate(allFrFiles),
    "translate"
  );
  const enFiles = parseFiles(enRaw);
  console.log("\n--- Writing EN docs ---");
  for (const [path, content] of Object.entries(enFiles)) {
    writeDoc(DOCS_EN, path, content);
  }
  const frCount = Object.keys(allFrFiles).length;
  const enCount = Object.keys(enFiles).length;
  console.log(`
Done! Generated ${frCount} FR + ${enCount} EN = ${frCount + enCount} files.`);
}
main().catch((err) => {
  console.error("Fatal error:", err.message || err);
  process.exit(1);
});

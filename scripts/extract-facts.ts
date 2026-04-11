// extract-facts.ts — Extract exports, imports, interfaces, functions from each package via ts-morph
// Install dependency: npm install -D ts-morph

import { Project, Node, SyntaxKind, SourceFile, ExportDeclaration, type ExportSpecifier } from 'ts-morph';
import * as path from 'node:path';
import * as fs from 'node:fs';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface ExportFact {
  name: string;
  kind: string;
  signature: string;
  jsdoc?: string;
  deprecated?: boolean;
}

interface ImportFact {
  from: string;
  symbols: string[];
}

interface InterfaceFact {
  name: string;
  properties: { name: string; type: string; optional: boolean }[];
}

interface FunctionFact {
  name: string;
  signature: string;
  params: { name: string; type: string }[];
  returnType: string;
}

interface PackageFacts {
  name: string;
  exports: ExportFact[];
  imports: ImportFact[];
  interfaces: InterfaceFact[];
  functions: FunctionFact[];
}

/* ------------------------------------------------------------------ */
/*  Config                                                             */
/* ------------------------------------------------------------------ */

const ROOT = path.resolve(import.meta.dirname ?? path.dirname(new URL(import.meta.url).pathname), '..');

const PACKAGES = [
  { name: '@webmcp-auto-ui/core', dir: 'packages/core' },
  { name: '@webmcp-auto-ui/agent', dir: 'packages/agent' },
  { name: '@webmcp-auto-ui/sdk', dir: 'packages/sdk' },
  { name: '@webmcp-auto-ui/ui', dir: 'packages/ui' },
];

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function getJsDoc(node: Node): string | undefined {
  const jsDocs = (node as any).getJsDocs?.();
  if (!jsDocs || jsDocs.length === 0) return undefined;
  return jsDocs.map((d: any) => d.getFullText().trim()).join('\n');
}

function isDeprecated(node: Node): boolean {
  const jsDocs = (node as any).getJsDocs?.();
  if (!jsDocs) return false;
  return jsDocs.some((d: any) => d.getFullText().includes('@deprecated'));
}

function classifyKind(node: Node): string {
  if (Node.isFunctionDeclaration(node)) return 'function';
  if (Node.isClassDeclaration(node)) return 'class';
  if (Node.isInterfaceDeclaration(node)) return 'interface';
  if (Node.isTypeAliasDeclaration(node)) return 'type';
  if (Node.isEnumDeclaration(node)) return 'enum';
  if (Node.isVariableDeclaration(node)) {
    const init = node.getInitializer();
    if (init && Node.isArrowFunction(init)) return 'function';
    if (init && Node.isFunctionExpression(init)) return 'function';
    return 'const';
  }
  return 'unknown';
}

function getSignature(node: Node, name: string): string {
  if (Node.isFunctionDeclaration(node)) {
    // Remove body, keep just the signature
    const params = node.getParameters().map(p => p.getText()).join(', ');
    const ret = node.getReturnTypeNode()?.getText() ?? node.getReturnType().getText(node);
    return `function ${name}(${params}): ${ret}`;
  }
  if (Node.isVariableDeclaration(node)) {
    const typeNode = node.getTypeNode();
    if (typeNode) return `const ${name}: ${typeNode.getText()}`;
    const init = node.getInitializer();
    if (init && (Node.isArrowFunction(init) || Node.isFunctionExpression(init))) {
      const fn = init;
      const params = (fn as any).getParameters?.()?.map((p: any) => p.getText()).join(', ') ?? '';
      const ret = (fn as any).getReturnTypeNode?.()?.getText() ?? (fn as any).getReturnType?.()?.getText(fn) ?? 'unknown';
      return `const ${name} = (${params}) => ${ret}`;
    }
    const type = node.getType().getText(node);
    return `const ${name}: ${type}`;
  }
  if (Node.isClassDeclaration(node)) return `class ${name}`;
  if (Node.isInterfaceDeclaration(node)) return `interface ${name}`;
  if (Node.isTypeAliasDeclaration(node)) {
    return `type ${name} = ${node.getTypeNode()?.getText() ?? '...'}`;
  }
  if (Node.isEnumDeclaration(node)) return `enum ${name}`;
  return name;
}

/**
 * Resolve a module specifier like './types.js' relative to a source file,
 * returning the resolved SourceFile (or undefined).
 */
function resolveModule(sf: SourceFile, moduleSpecifier: string): SourceFile | undefined {
  // Skip external modules
  if (!moduleSpecifier.startsWith('.') && !moduleSpecifier.startsWith('/')) return undefined;

  const dir = path.dirname(sf.getFilePath());
  let resolved = path.resolve(dir, moduleSpecifier);

  // Handle .js → .ts mapping
  if (resolved.endsWith('.js')) {
    resolved = resolved.replace(/\.js$/, '.ts');
  }

  const project = sf.getProject();

  // Try exact path
  let target = project.getSourceFile(resolved);
  if (target) return target;

  // Try with .ts extension
  target = project.getSourceFile(resolved + '.ts');
  if (target) return target;

  // Try index.ts
  target = project.getSourceFile(path.join(resolved, 'index.ts'));
  return target ?? undefined;
}

/**
 * Given an export declaration like `export { Foo, Bar } from './types.js'`,
 * resolve the actual declarations from the target module.
 */
function resolveExportSpecifier(
  spec: ExportSpecifier,
  exportDecl: ExportDeclaration,
  indexFile: SourceFile,
): Node | undefined {
  const moduleSpecifier = exportDecl.getModuleSpecifierValue();
  if (!moduleSpecifier) return undefined;

  const targetFile = resolveModule(indexFile, moduleSpecifier);
  if (!targetFile) return undefined;

  const exportedName = spec.getName();
  const aliasName = spec.getAliasNode()?.getText() ?? exportedName;

  // Look for the symbol in the target file
  for (const stmt of targetFile.getStatements()) {
    if (Node.isFunctionDeclaration(stmt) && stmt.getName() === exportedName) return stmt;
    if (Node.isClassDeclaration(stmt) && stmt.getName() === exportedName) return stmt;
    if (Node.isInterfaceDeclaration(stmt) && stmt.getName() === exportedName) return stmt;
    if (Node.isTypeAliasDeclaration(stmt) && stmt.getName() === exportedName) return stmt;
    if (Node.isEnumDeclaration(stmt) && stmt.getName() === exportedName) return stmt;
    if (Node.isVariableStatement(stmt)) {
      for (const decl of stmt.getDeclarationList().getDeclarations()) {
        if (decl.getName() === exportedName) return decl;
      }
    }
    // Check for re-exports in the target
    if (Node.isExportDeclaration(stmt)) {
      for (const namedExport of stmt.getNamedExports()) {
        if (namedExport.getName() === exportedName) {
          return resolveExportSpecifier(namedExport, stmt, targetFile);
        }
      }
    }
  }
  return undefined;
}

/* ------------------------------------------------------------------ */
/*  Star export resolution                                              */
/* ------------------------------------------------------------------ */

function resolveStarExports(
  exportDecl: ExportDeclaration,
  indexFile: SourceFile,
): { name: string; node: Node }[] {
  const moduleSpecifier = exportDecl.getModuleSpecifierValue();
  if (!moduleSpecifier) return [];

  const targetFile = resolveModule(indexFile, moduleSpecifier);
  if (!targetFile) return [];

  const results: { name: string; node: Node }[] = [];

  for (const stmt of targetFile.getStatements()) {
    // Exported function
    if (Node.isFunctionDeclaration(stmt) && stmt.isExported() && stmt.getName()) {
      results.push({ name: stmt.getName()!, node: stmt });
    }
    // Exported class
    if (Node.isClassDeclaration(stmt) && stmt.isExported() && stmt.getName()) {
      results.push({ name: stmt.getName()!, node: stmt });
    }
    // Exported interface
    if (Node.isInterfaceDeclaration(stmt) && stmt.isExported() && stmt.getName()) {
      results.push({ name: stmt.getName()!, node: stmt });
    }
    // Exported type alias
    if (Node.isTypeAliasDeclaration(stmt) && stmt.isExported()) {
      results.push({ name: stmt.getName(), node: stmt });
    }
    // Exported enum
    if (Node.isEnumDeclaration(stmt) && stmt.isExported()) {
      results.push({ name: stmt.getName(), node: stmt });
    }
    // Exported variables
    if (Node.isVariableStatement(stmt) && stmt.isExported()) {
      for (const decl of stmt.getDeclarationList().getDeclarations()) {
        results.push({ name: decl.getName(), node: decl });
      }
    }
    // Nested export declarations (named re-exports)
    if (Node.isExportDeclaration(stmt)) {
      if (stmt.getNamedExports().length > 0) {
        for (const spec of stmt.getNamedExports()) {
          const resolved = resolveExportSpecifier(spec, stmt, targetFile);
          if (resolved) {
            results.push({ name: spec.getAliasNode()?.getText() ?? spec.getName(), node: resolved });
          } else {
            // Fallback: create a stub entry
            results.push({
              name: spec.getAliasNode()?.getText() ?? spec.getName(),
              node: spec as unknown as Node,
            });
          }
        }
      } else if (stmt.getModuleSpecifierValue()) {
        // Nested star export — recurse
        results.push(...resolveStarExports(stmt, targetFile));
      }
    }
  }

  return results;
}

/* ------------------------------------------------------------------ */
/*  Extract facts for one package                                       */
/* ------------------------------------------------------------------ */

function extractPackageFacts(pkgName: string, pkgDir: string): PackageFacts {
  const facts: PackageFacts = {
    name: pkgName,
    exports: [],
    imports: [],
    interfaces: [],
    functions: [],
  };

  const srcDir = path.join(pkgDir, 'src');
  if (!fs.existsSync(srcDir)) {
    console.warn(`  [WARN] No src/ directory found for ${pkgName}`);
    return facts;
  }

  // Create a ts-morph project for this package (only .ts files, skip .svelte)
  const project = new Project({
    compilerOptions: {
      target: 99, // ESNext
      module: 199, // NodeNext
      moduleResolution: 99, // NodeNext
      strict: true,
      skipLibCheck: true,
      lib: ['ES2022', 'DOM'],
    },
    skipAddingFilesFromTsConfig: true,
  });

  // Add only .ts files (not .svelte)
  const tsFiles: string[] = [];
  function walkDir(dir: string) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory() && entry.name !== 'node_modules' && entry.name !== 'dist') {
        walkDir(fullPath);
      } else if (entry.isFile() && entry.name.endsWith('.ts') && !entry.name.endsWith('.d.ts')) {
        tsFiles.push(fullPath);
      }
    }
  }

  try {
    walkDir(srcDir);
  } catch (e: any) {
    console.warn(`  [WARN] Error walking ${srcDir}: ${e.message}`);
    return facts;
  }

  for (const f of tsFiles) {
    try {
      project.addSourceFileAtPath(f);
    } catch (e: any) {
      console.warn(`  [WARN] Could not add file ${f}: ${e.message}`);
    }
  }

  // Find index.ts
  const indexFile = project.getSourceFile(path.join(srcDir, 'index.ts'));
  if (!indexFile) {
    console.warn(`  [WARN] No index.ts found for ${pkgName}`);
    return facts;
  }

  // --- Collect exports from index.ts ---
  const seenExports = new Set<string>();

  // Process export declarations (named re-exports + star exports)
  for (const exportDecl of indexFile.getExportDeclarations()) {
    const namedExports = exportDecl.getNamedExports();

    if (namedExports.length > 0) {
      // Named exports: export { Foo, Bar } from './module.js'
      for (const spec of namedExports) {
        const exportName = spec.getAliasNode()?.getText() ?? spec.getName();
        if (seenExports.has(exportName)) continue;
        seenExports.add(exportName);

        const isTypeOnly = exportDecl.isTypeOnly() || spec.isTypeOnly();
        const resolved = resolveExportSpecifier(spec, exportDecl, indexFile);

        if (resolved) {
          const kind = isTypeOnly ? classifyKind(resolved).replace('const', 'type') : classifyKind(resolved);
          facts.exports.push({
            name: exportName,
            kind,
            signature: getSignature(resolved, exportName),
            jsdoc: getJsDoc(resolved) ?? undefined,
            deprecated: isDeprecated(resolved) || undefined,
          });

          // Collect interfaces
          if (Node.isInterfaceDeclaration(resolved)) {
            facts.interfaces.push({
              name: exportName,
              properties: resolved.getProperties().map(p => ({
                name: p.getName(),
                type: p.getTypeNode()?.getText() ?? p.getType().getText(p),
                optional: p.hasQuestionToken(),
              })),
            });
          }

          // Collect functions
          if (Node.isFunctionDeclaration(resolved)) {
            facts.functions.push({
              name: exportName,
              signature: getSignature(resolved, exportName),
              params: resolved.getParameters().map(p => ({
                name: p.getName(),
                type: p.getTypeNode()?.getText() ?? p.getType().getText(p),
              })),
              returnType: resolved.getReturnTypeNode()?.getText() ?? resolved.getReturnType().getText(resolved),
            });
          }

          // Arrow functions in const
          if (Node.isVariableDeclaration(resolved)) {
            const init = resolved.getInitializer();
            if (init && (Node.isArrowFunction(init) || Node.isFunctionExpression(init))) {
              facts.functions.push({
                name: exportName,
                signature: getSignature(resolved, exportName),
                params: (init as any).getParameters?.()?.map((p: any) => ({
                  name: p.getName(),
                  type: p.getTypeNode()?.getText() ?? p.getType().getText(p),
                })) ?? [],
                returnType: (init as any).getReturnTypeNode?.()?.getText() ??
                  (init as any).getReturnType?.()?.getText(init) ?? 'unknown',
              });
            }
          }
        } else {
          // Could not resolve — still record the export
          facts.exports.push({
            name: exportName,
            kind: isTypeOnly ? 'type' : 'unknown',
            signature: exportName,
          });
        }
      }
    } else if (exportDecl.getModuleSpecifierValue()) {
      // Star export: export * from './module.js'
      const starExports = resolveStarExports(exportDecl, indexFile);
      for (const { name, node } of starExports) {
        if (seenExports.has(name)) continue;
        seenExports.add(name);

        facts.exports.push({
          name,
          kind: classifyKind(node),
          signature: getSignature(node, name),
          jsdoc: getJsDoc(node) ?? undefined,
          deprecated: isDeprecated(node) || undefined,
        });

        if (Node.isInterfaceDeclaration(node)) {
          facts.interfaces.push({
            name,
            properties: node.getProperties().map(p => ({
              name: p.getName(),
              type: p.getTypeNode()?.getText() ?? p.getType().getText(p),
              optional: p.hasQuestionToken(),
            })),
          });
        }
        if (Node.isFunctionDeclaration(node)) {
          facts.functions.push({
            name,
            signature: getSignature(node, name),
            params: node.getParameters().map(p => ({
              name: p.getName(),
              type: p.getTypeNode()?.getText() ?? p.getType().getText(p),
            })),
            returnType: node.getReturnTypeNode()?.getText() ?? node.getReturnType().getText(node),
          });
        }
      }
    }
  }

  // Process direct exports in index.ts (export interface, export function, export const, etc.)
  for (const stmt of indexFile.getStatements()) {
    if (Node.isInterfaceDeclaration(stmt) && stmt.isExported()) {
      const name = stmt.getName();
      if (seenExports.has(name)) continue;
      seenExports.add(name);

      facts.exports.push({
        name,
        kind: 'interface',
        signature: `interface ${name}`,
        jsdoc: getJsDoc(stmt) ?? undefined,
        deprecated: isDeprecated(stmt) || undefined,
      });
      facts.interfaces.push({
        name,
        properties: stmt.getProperties().map(p => ({
          name: p.getName(),
          type: p.getTypeNode()?.getText() ?? p.getType().getText(p),
          optional: p.hasQuestionToken(),
        })),
      });
    }

    if (Node.isFunctionDeclaration(stmt) && stmt.isExported() && stmt.getName()) {
      const name = stmt.getName()!;
      if (seenExports.has(name)) continue;
      seenExports.add(name);

      facts.exports.push({
        name,
        kind: 'function',
        signature: getSignature(stmt, name),
        jsdoc: getJsDoc(stmt) ?? undefined,
        deprecated: isDeprecated(stmt) || undefined,
      });
      facts.functions.push({
        name,
        signature: getSignature(stmt, name),
        params: stmt.getParameters().map(p => ({
          name: p.getName(),
          type: p.getTypeNode()?.getText() ?? p.getType().getText(p),
        })),
        returnType: stmt.getReturnTypeNode()?.getText() ?? stmt.getReturnType().getText(stmt),
      });
    }

    if (Node.isVariableStatement(stmt) && stmt.isExported()) {
      for (const decl of stmt.getDeclarationList().getDeclarations()) {
        const name = decl.getName();
        if (seenExports.has(name)) continue;
        seenExports.add(name);

        const init = decl.getInitializer();
        const isFunc = init && (Node.isArrowFunction(init) || Node.isFunctionExpression(init));

        facts.exports.push({
          name,
          kind: isFunc ? 'function' : 'const',
          signature: getSignature(decl, name),
          jsdoc: getJsDoc(stmt) ?? undefined,
          deprecated: isDeprecated(stmt) || undefined,
        });

        if (isFunc) {
          facts.functions.push({
            name,
            signature: getSignature(decl, name),
            params: (init as any).getParameters?.()?.map((p: any) => ({
              name: p.getName(),
              type: p.getTypeNode()?.getText() ?? p.getType().getText(p),
            })) ?? [],
            returnType: (init as any).getReturnTypeNode?.()?.getText() ??
              (init as any).getReturnType?.()?.getText(init) ?? 'unknown',
          });
        }
      }
    }

    if (Node.isTypeAliasDeclaration(stmt) && stmt.isExported()) {
      const name = stmt.getName();
      if (seenExports.has(name)) continue;
      seenExports.add(name);

      facts.exports.push({
        name,
        kind: 'type',
        signature: `type ${name} = ${stmt.getTypeNode()?.getText() ?? '...'}`,
        jsdoc: getJsDoc(stmt) ?? undefined,
        deprecated: isDeprecated(stmt) || undefined,
      });
    }
  }

  // --- Collect inter-package imports ---
  const interPkgImports = new Map<string, Set<string>>();
  const packageNames = PACKAGES.map(p => p.name);

  for (const sf of project.getSourceFiles()) {
    for (const imp of sf.getImportDeclarations()) {
      const moduleSpec = imp.getModuleSpecifierValue();
      // Check if it's an inter-package import
      const matchedPkg = packageNames.find(pn => moduleSpec === pn || moduleSpec.startsWith(pn + '/'));
      if (matchedPkg) {
        if (!interPkgImports.has(matchedPkg)) {
          interPkgImports.set(matchedPkg, new Set());
        }
        const symbols = interPkgImports.get(matchedPkg)!;
        for (const named of imp.getNamedImports()) {
          symbols.add(named.getName());
        }
        const defaultImport = imp.getDefaultImport();
        if (defaultImport) {
          symbols.add(defaultImport.getText());
        }
        const namespaceImport = imp.getNamespaceImport();
        if (namespaceImport) {
          symbols.add('* as ' + namespaceImport.getText());
        }
      }
    }
  }

  for (const [from, symbols] of interPkgImports) {
    facts.imports.push({ from, symbols: [...symbols].sort() });
  }

  return facts;
}

/* ------------------------------------------------------------------ */
/*  Main                                                                */
/* ------------------------------------------------------------------ */

function main() {
  console.log('Extracting facts from packages...\n');

  const allFacts: PackageFacts[] = [];

  for (const pkg of PACKAGES) {
    const pkgDir = path.join(ROOT, pkg.dir);
    console.log(`Processing ${pkg.name} (${pkg.dir})...`);

    try {
      const facts = extractPackageFacts(pkg.name, pkgDir);
      allFacts.push(facts);
      console.log(`  ${facts.exports.length} exports, ${facts.imports.length} import sources, ${facts.interfaces.length} interfaces, ${facts.functions.length} functions`);
    } catch (e: any) {
      console.error(`  [ERROR] Failed to process ${pkg.name}: ${e.message}`);
      allFacts.push({
        name: pkg.name,
        exports: [],
        imports: [],
        interfaces: [],
        functions: [],
      });
    }
  }

  // Write output
  const docsDir = path.join(ROOT, 'docs');
  if (!fs.existsSync(docsDir)) {
    fs.mkdirSync(docsDir, { recursive: true });
  }

  const outPath = path.join(docsDir, 'facts.json');
  fs.writeFileSync(outPath, JSON.stringify(allFacts, null, 2) + '\n');
  console.log(`\nWrote ${outPath}`);
}

main();

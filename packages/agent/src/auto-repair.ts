/**
 * Auto-repair tool call params before dispatch.
 * Tries mechanical fixes, returns repaired params + list of fixes applied.
 * If repair fails, returns the original params unchanged.
 */

export interface RepairResult {
  params: Record<string, unknown>;
  fixes: string[];
}

export function autoRepairParams(
  input: Record<string, unknown>,
  schema: Record<string, unknown>,
  toolName: string,
): RepairResult {
  const fixes: string[] = [];
  let params = { ...input };
  const properties = (schema.properties ?? {}) as Record<string, Record<string, unknown>>;
  const required = (schema.required ?? []) as string[];

  // 1. Flat params → nested object
  // If schema expects {name: string, params: object} but input has {name: string, ...rest}
  // and "params" is a required field of type object but missing from input
  if (properties.params?.type === 'object' && !('params' in params)) {
    const { name, ...rest } = params;
    if (name && Object.keys(rest).length > 0) {
      params = { name, params: rest };
      fixes.push('flat params → nested {name, params:{...}}');
    }
  }

  // 2. Stringified JSON → parse
  for (const [key, propSchema] of Object.entries(properties)) {
    if (key in params && typeof params[key] === 'string' && propSchema.type === 'object') {
      try {
        const parsed = JSON.parse(params[key] as string);
        if (typeof parsed === 'object' && parsed !== null) {
          params[key] = parsed;
          fixes.push(`${key}: stringified JSON → parsed object`);
        }
      } catch { /* not JSON, leave as-is */ }
    }
  }

  // 3. Type coercion: string → number
  for (const [key, propSchema] of Object.entries(properties)) {
    if (key in params) {
      const val = params[key];
      if (propSchema.type === 'number' && typeof val === 'string') {
        const num = parseFloat(val);
        if (!isNaN(num)) {
          params[key] = num;
          fixes.push(`${key}: string "${val}" → number ${num}`);
        }
      }
      if (propSchema.type === 'integer' && typeof val === 'string') {
        const num = parseInt(val, 10);
        if (!isNaN(num)) {
          params[key] = num;
          fixes.push(`${key}: string "${val}" → integer ${num}`);
        }
      }
      // number → string
      if (propSchema.type === 'string' && typeof val === 'number') {
        params[key] = String(val);
        fixes.push(`${key}: number ${val} → string "${val}"`);
      }
      // boolean coercion
      if (propSchema.type === 'boolean' && typeof val === 'string') {
        if (val === 'true' || val === '1') { params[key] = true; fixes.push(`${key}: "${val}" → true`); }
        if (val === 'false' || val === '0') { params[key] = false; fixes.push(`${key}: "${val}" → false`); }
      }
    }
  }

  // 4. Missing required field with default value in schema
  for (const req of required) {
    if (!(req in params) && properties[req]) {
      const propSchema = properties[req];
      if ('default' in propSchema) {
        params[req] = propSchema.default;
        fixes.push(`${req}: missing required → default ${JSON.stringify(propSchema.default)}`);
      }
      // If enum with single value, use it (only if not already filled by default above)
      else if (propSchema.enum && (propSchema.enum as unknown[]).length === 1) {
        params[req] = (propSchema.enum as unknown[])[0];
        fixes.push(`${req}: missing required → single enum ${JSON.stringify(params[req])}`);
      }
    }
  }

  return { params, fixes };
}

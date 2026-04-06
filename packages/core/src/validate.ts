import type { JsonSchema } from './types.js';

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

export interface ValidationError {
  path: string;
  message: string;
  keyword: string;
  expected?: unknown;
  actual?: unknown;
}

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
}

// ---------------------------------------------------------------------------
// Format validators (regex, not RFC-strict)
// ---------------------------------------------------------------------------

const FORMAT_VALIDATORS: Record<string, (v: string) => boolean> = {
  email: v => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v),
  uri: v => /^https?:\/\/.+/.test(v),
  date: v => !isNaN(Date.parse(v)) && /^\d{4}-\d{2}-\d{2}$/.test(v),
  'date-time': v => !isNaN(Date.parse(v)),
  uuid: v => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v),
};

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function checkType(value: unknown, type: string): boolean {
  switch (type) {
    case 'string':  return typeof value === 'string';
    case 'boolean': return typeof value === 'boolean';
    case 'null':    return value === null;
    case 'integer': return typeof value === 'number' && Number.isInteger(value);
    case 'number':  return typeof value === 'number';
    case 'array':   return Array.isArray(value);
    case 'object':  return typeof value === 'object' && value !== null && !Array.isArray(value);
    default:        return false;
  }
}

function formatPath(base: string, key: string | number): string {
  if (typeof key === 'number') return `${base}[${key}]`;
  return base === '' ? key : `${base}.${key}`;
}

function err(
  path: string,
  keyword: string,
  message: string,
  expected?: unknown,
  actual?: unknown,
): ValidationError {
  return { path, message, keyword, expected, actual };
}

// ---------------------------------------------------------------------------
// Main validator
// ---------------------------------------------------------------------------

export function validateJsonSchema(
  value: unknown,
  schema: JsonSchema,
  path = '',
): ValidationResult {
  const errors: ValidationError[] = [];

  // Boolean schema shorthand
  if (typeof schema === 'boolean') {
    if (!schema) {
      errors.push(err(path, 'false schema', 'Value is not allowed by schema'));
    }
    return { valid: errors.length === 0, errors };
  }

  // --- type ----------------------------------------------------------------
  if (schema.type !== undefined) {
    const types = Array.isArray(schema.type) ? schema.type : [schema.type];
    const typeMatch = types.some(t => checkType(value, t));
    if (!typeMatch) {
      errors.push(err(path, 'type', `Expected type ${types.join(' | ')} but got ${value === null ? 'null' : Array.isArray(value) ? 'array' : typeof value}`, types, value));
    }
  }

  // --- enum ----------------------------------------------------------------
  if (schema.enum !== undefined) {
    const inEnum = (schema.enum as unknown[]).some(e => JSON.stringify(e) === JSON.stringify(value));
    if (!inEnum) {
      errors.push(err(path, 'enum', `Value must be one of: ${JSON.stringify(schema.enum)}`, schema.enum, value));
    }
  }

  // --- const ---------------------------------------------------------------
  if ('const' in schema) {
    if (JSON.stringify(value) !== JSON.stringify(schema.const)) {
      errors.push(err(path, 'const', `Value must equal ${JSON.stringify(schema.const)}`, schema.const, value));
    }
  }

  // --- string keywords -----------------------------------------------------
  if (typeof value === 'string') {
    if (schema.minLength !== undefined && value.length < schema.minLength) {
      errors.push(err(path, 'minLength', `String length ${value.length} is less than minLength ${schema.minLength}`, schema.minLength, value.length));
    }
    if (schema.maxLength !== undefined && value.length > schema.maxLength) {
      errors.push(err(path, 'maxLength', `String length ${value.length} exceeds maxLength ${schema.maxLength}`, schema.maxLength, value.length));
    }
    if (schema.pattern !== undefined) {
      try {
        const re = new RegExp(schema.pattern as string);
        if (!re.test(value)) {
          errors.push(err(path, 'pattern', `String does not match pattern ${schema.pattern}`, schema.pattern, value));
        }
      } catch {
        errors.push(err(path, 'pattern', `Invalid regex pattern: ${schema.pattern}`, schema.pattern, value));
      }
    }
    if (schema.format !== undefined) {
      const validator = FORMAT_VALIDATORS[schema.format as string];
      if (validator && !validator(value)) {
        errors.push(err(path, 'format', `String does not match format "${schema.format}"`, schema.format, value));
      }
    }
  }

  // --- number / integer keywords ------------------------------------------
  if (typeof value === 'number') {
    if (schema.minimum !== undefined && value < (schema.minimum as number)) {
      errors.push(err(path, 'minimum', `Value ${value} is less than minimum ${schema.minimum}`, schema.minimum, value));
    }
    if (schema.maximum !== undefined && value > (schema.maximum as number)) {
      errors.push(err(path, 'maximum', `Value ${value} exceeds maximum ${schema.maximum}`, schema.maximum, value));
    }
    if (schema.exclusiveMinimum !== undefined && typeof schema.exclusiveMinimum === 'number' && value <= schema.exclusiveMinimum) {
      errors.push(err(path, 'exclusiveMinimum', `Value ${value} must be greater than ${schema.exclusiveMinimum}`, schema.exclusiveMinimum, value));
    }
    if (schema.exclusiveMaximum !== undefined && typeof schema.exclusiveMaximum === 'number' && value >= schema.exclusiveMaximum) {
      errors.push(err(path, 'exclusiveMaximum', `Value ${value} must be less than ${schema.exclusiveMaximum}`, schema.exclusiveMaximum, value));
    }
    if (schema.multipleOf !== undefined) {
      const multiple = schema.multipleOf as number;
      const remainder = Math.abs(value - multiple * Math.round(value / multiple));
      if (remainder > 1e-10) {
        errors.push(err(path, 'multipleOf', `Value ${value} is not a multiple of ${multiple}`, multiple, value));
      }
    }
  }

  // --- object keywords -----------------------------------------------------
  if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
    const obj = value as Record<string, unknown>;
    const declaredKeys = new Set(Object.keys((schema.properties as Record<string, JsonSchema>) ?? {}));

    // required
    if (schema.required !== undefined) {
      for (const key of schema.required as string[]) {
        if (!(key in obj)) {
          errors.push(err(path, 'required', `Missing required property "${key}"`, key));
        }
      }
    }

    // properties
    if (schema.properties !== undefined) {
      const props = schema.properties as Record<string, JsonSchema>;
      for (const [key, subSchema] of Object.entries(props)) {
        if (key in obj) {
          const nested = validateJsonSchema(obj[key], subSchema, formatPath(path, key));
          errors.push(...nested.errors);
        }
      }
    }

    // additionalProperties
    if (schema.additionalProperties !== undefined) {
      const extraKeys = Object.keys(obj).filter(k => !declaredKeys.has(k));
      if (schema.additionalProperties === false) {
        for (const key of extraKeys) {
          errors.push(err(formatPath(path, key), 'additionalProperties', `Additional property "${key}" is not allowed`));
        }
      } else if (typeof schema.additionalProperties === 'object') {
        for (const key of extraKeys) {
          const nested = validateJsonSchema(obj[key], schema.additionalProperties as JsonSchema, formatPath(path, key));
          errors.push(...nested.errors);
        }
      }
    }

    // patternProperties
    if (schema.patternProperties !== undefined) {
      for (const [pattern, subSchema] of Object.entries(schema.patternProperties as Record<string, JsonSchema>)) {
        const re = new RegExp(pattern);
        for (const key of Object.keys(obj)) {
          if (re.test(key)) {
            const nested = validateJsonSchema(obj[key], subSchema, formatPath(path, key));
            errors.push(...nested.errors);
          }
        }
      }
    }
  }

  // --- array keywords ------------------------------------------------------
  if (Array.isArray(value)) {
    if (schema.minItems !== undefined && value.length < (schema.minItems as number)) {
      errors.push(err(path, 'minItems', `Array length ${value.length} is less than minItems ${schema.minItems}`, schema.minItems, value.length));
    }
    if (schema.maxItems !== undefined && value.length > (schema.maxItems as number)) {
      errors.push(err(path, 'maxItems', `Array length ${value.length} exceeds maxItems ${schema.maxItems}`, schema.maxItems, value.length));
    }
    if (schema.items !== undefined) {
      const itemSchema = schema.items as JsonSchema;
      for (let i = 0; i < value.length; i++) {
        const nested = validateJsonSchema(value[i], itemSchema, formatPath(path, i));
        errors.push(...nested.errors);
      }
    }
    if (schema.uniqueItems) {
      const seen = new Set<string>();
      for (let i = 0; i < value.length; i++) {
        const serialized = JSON.stringify(value[i]);
        if (seen.has(serialized)) {
          errors.push(err(formatPath(path, i), 'uniqueItems', `Duplicate item at index ${i}`));
        }
        seen.add(serialized);
      }
    }
  }

  // --- composition keywords ------------------------------------------------

  // allOf
  if (schema.allOf !== undefined) {
    for (let i = 0; i < (schema.allOf as JsonSchema[]).length; i++) {
      const nested = validateJsonSchema(value, (schema.allOf as JsonSchema[])[i], path);
      if (!nested.valid) {
        for (const e of nested.errors) {
          errors.push({ ...e, keyword: `allOf[${i}]/${e.keyword}` });
        }
      }
    }
  }

  // anyOf
  if (schema.anyOf !== undefined) {
    const anyOfSchemas = schema.anyOf as JsonSchema[];
    const anyMatch = anyOfSchemas.some(s => validateJsonSchema(value, s, path).valid);
    if (!anyMatch) {
      errors.push(err(path, 'anyOf', 'Value does not match any of the required schemas'));
    }
  }

  // oneOf
  if (schema.oneOf !== undefined) {
    const oneOfSchemas = schema.oneOf as JsonSchema[];
    const matching = oneOfSchemas.filter(s => validateJsonSchema(value, s, path).valid);
    if (matching.length !== 1) {
      errors.push(err(
        path,
        'oneOf',
        `Value must match exactly one schema, but matched ${matching.length}`,
        1,
        matching.length,
      ));
    }
  }

  // not
  if (schema.not !== undefined) {
    const notResult = validateJsonSchema(value, schema.not as JsonSchema, path);
    if (notResult.valid) {
      errors.push(err(path, 'not', 'Value must NOT be valid against the "not" schema'));
    }
  }

  return { valid: errors.length === 0, errors };
}

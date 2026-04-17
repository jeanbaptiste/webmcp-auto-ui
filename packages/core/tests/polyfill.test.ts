import { describe, it, expect } from 'vitest';
import { sanitizeSchema } from '../src/utils.js';
import { validateJsonSchema } from '../src/validate.js';
import { textResult, jsonResult } from '../src/webmcp-helpers.js';
import type { JsonSchema } from '../src/types.js';

describe('sanitizeSchema', () => {
  it('preserves valid schema fields', () => {
    const schema = { type: 'object', properties: { name: { type: 'string' } } } as JsonSchema;
    const result = sanitizeSchema(schema) as Record<string, unknown>;
    expect(result['type']).toBe('object');
    expect(result['properties']).toBeDefined();
  });

  it('strips oneOf', () => {
    const schema = { type: 'object', oneOf: [{ type: 'string' }], properties: {} } as unknown as JsonSchema;
    const result = sanitizeSchema(schema) as Record<string, unknown>;
    expect(result['oneOf']).toBeUndefined();
  });

  it('preserves anyOf', () => {
    const schema = { type: 'object', anyOf: [{ type: 'string' }], properties: {} } as unknown as JsonSchema;
    const result = sanitizeSchema(schema) as Record<string, unknown>;
    expect(result['anyOf']).toEqual([{ type: 'string' }]);
  });

  it('preserves allOf', () => {
    const schema = { type: 'object', allOf: [{ type: 'string' }], properties: {} } as unknown as JsonSchema;
    const result = sanitizeSchema(schema) as Record<string, unknown>;
    expect(result['allOf']).toEqual([{ type: 'string' }]);
  });

  it('strips $ref', () => {
    const schema = { $ref: '#/definitions/foo', type: 'object', properties: {} } as unknown as JsonSchema;
    const result = sanitizeSchema(schema) as Record<string, unknown>;
    expect(result['$ref']).toBeUndefined();
  });

  it('strips if/then/else', () => {
    const schema = {
      type: 'object',
      if: { type: 'string' }, then: { type: 'string' }, else: { type: 'number' },
      properties: {},
    } as unknown as JsonSchema;
    const result = sanitizeSchema(schema) as Record<string, unknown>;
    expect(result['if']).toBeUndefined();
    expect(result['then']).toBeUndefined();
    expect(result['else']).toBeUndefined();
  });

  it('recurses into nested properties', () => {
    const schema = {
      type: 'object',
      properties: { child: { type: 'object', oneOf: [{ type: 'string' }], properties: {} } },
    } as unknown as JsonSchema;
    const result = sanitizeSchema(schema) as { properties: { child: Record<string, unknown> } };
    expect(result.properties.child['oneOf']).toBeUndefined();
  });

  it('handles array items and preserves nested anyOf', () => {
    const schema = {
      type: 'array',
      items: { type: 'object', anyOf: [{ type: 'string' }], properties: {} },
    } as unknown as JsonSchema;
    const result = sanitizeSchema(schema) as { items: Record<string, unknown> };
    expect(result.items['anyOf']).toEqual([{ type: 'string' }]);
  });

  it('passes through boolean schema', () => {
    expect(sanitizeSchema(true as unknown as JsonSchema)).toBe(true);
    expect(sanitizeSchema(false as unknown as JsonSchema)).toBe(false);
  });
});

describe('validateJsonSchema', () => {
  it('returns valid when all required fields present', () => {
    const schema: JsonSchema = { type: 'object', properties: { name: { type: 'string' } }, required: ['name'] };
    expect(validateJsonSchema({ name: 'test' }, schema).valid).toBe(true);
  });

  it('returns invalid when required field missing', () => {
    const schema: JsonSchema = { type: 'object', properties: { name: { type: 'string' } }, required: ['name'] };
    const result = validateJsonSchema({}, schema);
    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it('returns valid with no required fields', () => {
    const schema: JsonSchema = { type: 'object', properties: { x: { type: 'number' } } };
    expect(validateJsonSchema({}, schema).valid).toBe(true);
  });

  it('validates string type', () => {
    expect(validateJsonSchema('hello', { type: 'string' }).valid).toBe(true);
    expect(validateJsonSchema(42, { type: 'string' }).valid).toBe(false);
  });

  it('validates number type', () => {
    expect(validateJsonSchema(42, { type: 'number' }).valid).toBe(true);
    expect(validateJsonSchema('str', { type: 'number' }).valid).toBe(false);
  });

  it('validates enum values', () => {
    const schema: JsonSchema = { type: 'string', enum: ['a', 'b', 'c'] };
    expect(validateJsonSchema('a', schema).valid).toBe(true);
    expect(validateJsonSchema('d', schema).valid).toBe(false);
  });

  it('validates nested object', () => {
    const schema: JsonSchema = {
      type: 'object',
      properties: { id: { type: 'number' }, name: { type: 'string' } },
      required: ['id'],
    };
    expect(validateJsonSchema({ id: 1, name: 'x' }, schema).valid).toBe(true);
    expect(validateJsonSchema({ name: 'x' }, schema).valid).toBe(false);
  });
});

describe('textResult', () => {
  it('returns MCP content structure', () => {
    expect(textResult('hello')).toEqual({ content: [{ type: 'text', text: 'hello' }] });
  });

  it('handles empty string', () => {
    expect(textResult('').content[0].text).toBe('');
  });
});

describe('jsonResult', () => {
  it('serialises object', () => {
    const r = jsonResult({ key: 'val' });
    expect(JSON.parse(r.content[0].text ?? '')).toEqual({ key: 'val' });
  });

  it('serialises array', () => {
    expect(JSON.parse(jsonResult([1, 2, 3]).content[0].text ?? '')).toEqual([1, 2, 3]);
  });

  it('serialises null', () => {
    expect(JSON.parse(jsonResult(null).content[0].text ?? '')).toBeNull();
  });

  it('serialises number', () => {
    expect(JSON.parse(jsonResult(42).content[0].text ?? '')).toBe(42);
  });
});

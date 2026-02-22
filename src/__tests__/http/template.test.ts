import { describe, expect, test } from 'bun:test'
import type { SchemaInfo } from '@/types/index.js'
import { generateBodyTemplate } from '@/http/template.js'

function makeSchema(overrides: Partial<SchemaInfo> = {}): SchemaInfo {
  return {
    type: 'object',
    nullable: false,
    readOnly: false,
    writeOnly: false,
    displayType: 'object',
    ...overrides,
  }
}

describe('generateBodyTemplate', () => {
  test('simple string schema returns empty string', () => {
    const schema = makeSchema({ type: 'string', displayType: 'string' })
    expect(generateBodyTemplate(schema)).toBe('""')
  })

  test('simple number schema returns 0', () => {
    const schema = makeSchema({ type: 'number', displayType: 'number' })
    expect(generateBodyTemplate(schema)).toBe('0')
  })

  test('simple integer schema returns 0', () => {
    const schema = makeSchema({ type: 'integer', displayType: 'integer' })
    expect(generateBodyTemplate(schema)).toBe('0')
  })

  test('simple boolean schema returns false', () => {
    const schema = makeSchema({ type: 'boolean', displayType: 'boolean' })
    expect(generateBodyTemplate(schema)).toBe('false')
  })

  test('null schema returns null', () => {
    const schema = makeSchema({ type: 'null', displayType: 'null' })
    expect(generateBodyTemplate(schema)).toBe('null')
  })

  test('schema with example uses example value', () => {
    const schema = makeSchema({
      type: 'string',
      displayType: 'string',
      example: 'hello@example.com',
    })
    expect(generateBodyTemplate(schema)).toBe('"hello@example.com"')
  })

  test('schema with defaultValue uses default value', () => {
    const schema = makeSchema({
      type: 'number',
      displayType: 'number',
      defaultValue: 42,
    })
    expect(generateBodyTemplate(schema)).toBe('42')
  })

  test('example takes priority over defaultValue', () => {
    const schema = makeSchema({
      type: 'string',
      displayType: 'string',
      example: 'from-example',
      defaultValue: 'from-default',
    })
    expect(generateBodyTemplate(schema)).toBe('"from-example"')
  })

  test('object with properties generates all fields', () => {
    const schema = makeSchema({
      type: 'object',
      displayType: 'object',
      properties: new Map<string, SchemaInfo>([
        ['name', makeSchema({ type: 'string', displayType: 'string' })],
        ['age', makeSchema({ type: 'integer', displayType: 'integer' })],
      ]),
    })
    const result = JSON.parse(generateBodyTemplate(schema))
    expect(result).toEqual({ name: '', age: 0 })
  })

  test('array with items generates one-element template array', () => {
    const schema = makeSchema({
      type: 'array',
      displayType: 'string[]',
      items: makeSchema({ type: 'string', displayType: 'string' }),
    })
    const result = JSON.parse(generateBodyTemplate(schema))
    expect(result).toEqual([''])
  })

  test('array without items generates empty array', () => {
    const schema = makeSchema({
      type: 'array',
      displayType: 'array',
    })
    const result = JSON.parse(generateBodyTemplate(schema))
    expect(result).toEqual([])
  })

  test('nested object generates recursively', () => {
    const innerSchema = makeSchema({
      type: 'object',
      displayType: 'Address',
      properties: new Map<string, SchemaInfo>([
        ['street', makeSchema({ type: 'string', displayType: 'string' })],
        ['zip', makeSchema({ type: 'string', displayType: 'string' })],
      ]),
    })
    const schema = makeSchema({
      type: 'object',
      displayType: 'User',
      properties: new Map<string, SchemaInfo>([
        ['name', makeSchema({ type: 'string', displayType: 'string' })],
        ['address', innerSchema],
      ]),
    })
    const result = JSON.parse(generateBodyTemplate(schema))
    expect(result).toEqual({
      name: '',
      address: { street: '', zip: '' },
    })
  })

  test('enum values uses first enum value', () => {
    const schema = makeSchema({
      type: 'string',
      displayType: 'string',
      enumValues: ['active', 'inactive', 'pending'],
    })
    expect(generateBodyTemplate(schema)).toBe('"active"')
  })

  test('circular reference protection returns empty object', () => {
    const schema = makeSchema({
      type: 'object',
      displayType: 'Node',
      properties: new Map<string, SchemaInfo>(),
    })
    // Create circular reference: schema.properties.self = schema
    ;(schema.properties as Map<string, SchemaInfo>).set('self', schema)

    const result = JSON.parse(generateBodyTemplate(schema))
    expect(result).toEqual({ self: {} })
  })

  test('depth cap at 10 levels returns empty object', () => {
    // Build a deeply nested object chain: each level has a single property "child"
    let deepest = makeSchema({
      type: 'string',
      displayType: 'string',
    })

    // Create 11 levels of nesting (0..10) so the innermost exceeds depth 10
    for (let i = 0; i < 11; i++) {
      deepest = makeSchema({
        type: 'object',
        displayType: 'object',
        properties: new Map<string, SchemaInfo>([['child', deepest]]),
      })
    }

    const result = JSON.parse(generateBodyTemplate(deepest))
    // Walk down to the 10th nested "child" -- it should be {} due to depth cap
    let current = result
    for (let i = 0; i < 10; i++) {
      expect(current).toHaveProperty('child')
      current = current.child
    }
    expect(current).toEqual({})
  })

  test('allOf merges first sub-schema', () => {
    const schema = makeSchema({
      type: 'object',
      displayType: 'object',
      allOf: [
        makeSchema({
          type: 'object',
          displayType: 'object',
          properties: new Map<string, SchemaInfo>([
            ['id', makeSchema({ type: 'integer', displayType: 'integer' })],
            ['name', makeSchema({ type: 'string', displayType: 'string' })],
          ]),
        }),
        makeSchema({
          type: 'object',
          displayType: 'object',
          properties: new Map<string, SchemaInfo>([
            ['email', makeSchema({ type: 'string', displayType: 'string' })],
          ]),
        }),
      ],
    })
    const result = JSON.parse(generateBodyTemplate(schema))
    expect(result).toEqual({ id: 0, name: '' })
  })

  test('oneOf uses first sub-schema', () => {
    const schema = makeSchema({
      type: 'object',
      displayType: 'object',
      oneOf: [
        makeSchema({
          type: 'object',
          displayType: 'Cat',
          properties: new Map<string, SchemaInfo>([
            ['purrs', makeSchema({ type: 'boolean', displayType: 'boolean' })],
          ]),
        }),
        makeSchema({
          type: 'object',
          displayType: 'Dog',
          properties: new Map<string, SchemaInfo>([
            ['barks', makeSchema({ type: 'boolean', displayType: 'boolean' })],
          ]),
        }),
      ],
    })
    const result = JSON.parse(generateBodyTemplate(schema))
    expect(result).toEqual({ purrs: false })
  })
})

import { describe, expect, test } from 'bun:test'
import { transformSchema } from '@/parser/transform-schema.js'

describe('transformSchema', () => {
  test('transforms string type', () => {
    const result = transformSchema({ type: 'string', format: 'email', description: 'User email' })
    expect(result.type).toBe('string')
    expect(result.format).toBe('email')
    expect(result.description).toBe('User email')
    expect(result.displayType).toBe('string')
  })

  test('transforms object with properties', () => {
    const result = transformSchema({
      type: 'object',
      required: ['name'],
      properties: {
        name: { type: 'string' },
        age: { type: 'integer' },
      },
    })
    expect(result.type).toBe('object')
    expect(result.properties?.size).toBe(2)
    expect(result.properties?.get('name')?.type).toBe('string')
    expect(result.required).toEqual(['name'])
  })

  test('transforms array with items', () => {
    const result = transformSchema({
      type: 'array',
      items: { type: 'string' },
    })
    expect(result.type).toBe('array')
    expect(result.items?.type).toBe('string')
    expect(result.displayType).toBe('string[]')
  })

  test('handles nullable v3.0 style', () => {
    const result = transformSchema({ type: 'string', nullable: true })
    expect(result.nullable).toBe(true)
  })

  test('handles nullable v3.1 style (type array)', () => {
    const result = transformSchema({ type: ['string', 'null'] })
    expect(result.type).toBe('string')
    expect(result.nullable).toBe(true)
  })

  test('transforms enum values', () => {
    const result = transformSchema({ type: 'string', enum: ['active', 'inactive'] })
    expect(result.enumValues).toEqual(['active', 'inactive'])
  })

  test('transforms oneOf', () => {
    const result = transformSchema({
      oneOf: [{ type: 'string' }, { type: 'integer' }],
    })
    expect(result.oneOf).toHaveLength(2)
  })

  test('preserves refName', () => {
    const result = transformSchema({ type: 'object', properties: {} }, 'Pet')
    expect(result.refName).toBe('Pet')
    expect(result.displayType).toBe('Pet')
  })

  test('handles circular references', () => {
    const schema: Record<string, unknown> = { type: 'object', properties: {} }
    ;(schema.properties as Record<string, unknown>).self = schema
    const result = transformSchema(schema)
    expect(result.properties?.get('self')?.displayType).toBe('[circular]')
  })

  test('extracts constraints', () => {
    const result = transformSchema({ type: 'integer', minimum: 0, maximum: 100 })
    expect(result.constraints?.minimum).toBe(0)
    expect(result.constraints?.maximum).toBe(100)
  })

  test('transforms additionalProperties boolean', () => {
    const result = transformSchema({
      type: 'object',
      additionalProperties: true,
    })
    expect(result.additionalProperties).toBe(true)
  })

  test('transforms additionalProperties schema', () => {
    const result = transformSchema({
      type: 'object',
      additionalProperties: { type: 'string' },
    })
    expect(result.additionalProperties).not.toBe(true)
    expect(typeof result.additionalProperties).toBe('object')
  })

  test('handles allOf composition', () => {
    const result = transformSchema({
      allOf: [
        { type: 'object', properties: { name: { type: 'string' } } },
        { type: 'object', properties: { age: { type: 'integer' } } },
      ],
    })
    expect(result.allOf).toHaveLength(2)
  })

  test('handles anyOf composition', () => {
    const result = transformSchema({
      anyOf: [{ type: 'string' }, { type: 'number' }],
    })
    expect(result.anyOf).toHaveLength(2)
  })

  test('handles readOnly and writeOnly', () => {
    const result = transformSchema({ type: 'string', readOnly: true })
    expect(result.readOnly).toBe(true)
    expect(result.writeOnly).toBe(false)
  })

  test('handles schema with no type', () => {
    const result = transformSchema({})
    expect(result.type).toBe('unknown')
  })

  test('handles example and default values', () => {
    const result = transformSchema({
      type: 'string',
      example: 'hello',
      default: 'world',
    })
    expect(result.example).toBe('hello')
    expect(result.defaultValue).toBe('world')
  })
})

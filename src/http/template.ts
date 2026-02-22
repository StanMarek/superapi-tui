import type { SchemaInfo } from '@/types/index.js'

const MAX_DEPTH = 10

function generateValue(schema: SchemaInfo, ancestors: Set<SchemaInfo>, depth: number): unknown {
  if (depth >= MAX_DEPTH) {
    return {}
  }

  if (ancestors.has(schema)) {
    return {}
  }

  // Priority: example > defaultValue > type-based generation
  if (schema.example !== undefined) {
    return schema.example
  }

  if (schema.defaultValue !== undefined) {
    return schema.defaultValue
  }

  // Enum values: use first
  if (schema.enumValues && schema.enumValues.length > 0) {
    return schema.enumValues[0]
  }

  // Composition: oneOf/anyOf use first sub-schema
  if (schema.oneOf && schema.oneOf.length > 0) {
    return generateValue(schema.oneOf[0], ancestors, depth)
  }

  if (schema.anyOf && schema.anyOf.length > 0) {
    return generateValue(schema.anyOf[0], ancestors, depth)
  }

  // allOf: merge all sub-schema results
  if (schema.allOf && schema.allOf.length > 0) {
    const merged: Record<string, unknown> = {}
    let hasObjectResult = false
    for (const sub of schema.allOf) {
      const value = generateValue(sub, ancestors, depth)
      if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
        Object.assign(merged, value as Record<string, unknown>)
        hasObjectResult = true
      }
    }
    return hasObjectResult ? merged : generateValue(schema.allOf[0], ancestors, depth)
  }

  switch (schema.type) {
    case 'string':
      return ''
    case 'number':
    case 'integer':
      return 0
    case 'boolean':
      return false
    case 'null':
      return null
    case 'array':
      if (schema.items) {
        ancestors.add(schema)
        const itemValue = generateValue(schema.items, ancestors, depth + 1)
        ancestors.delete(schema)
        return [itemValue]
      }
      return []
    case 'object': {
      if (!schema.properties || schema.properties.size === 0) {
        return {}
      }
      ancestors.add(schema)
      const result: Record<string, unknown> = {}
      for (const [key, propSchema] of schema.properties) {
        result[key] = generateValue(propSchema, ancestors, depth + 1)
      }
      ancestors.delete(schema)
      return result
    }
    default:
      return {}
  }
}

export function generateBodyTemplate(schema: SchemaInfo): string {
  const ancestors = new Set<SchemaInfo>()
  const value = generateValue(schema, ancestors, 0)
  try {
    return JSON.stringify(value, null, 2)
  } catch {
    return '{}'
  }
}

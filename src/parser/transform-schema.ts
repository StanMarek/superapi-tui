import type { SchemaConstraints, SchemaInfo, SchemaType } from '@/types/index.js'

type RawSchema = Record<string, unknown>

const VALID_TYPES = new Set<string>([
  'string',
  'number',
  'integer',
  'boolean',
  'array',
  'object',
  'null',
])

function resolveType(raw: unknown): { type: SchemaType; nullable: boolean } {
  // v3.1 style: type can be an array like ["string", "null"]
  if (Array.isArray(raw)) {
    const filtered = raw.filter((t) => t !== 'null')
    const nullable = raw.includes('null')
    const primary = filtered[0]
    if (typeof primary === 'string' && VALID_TYPES.has(primary)) {
      return { type: primary as SchemaType, nullable }
    }
    return { type: 'unknown', nullable }
  }

  if (typeof raw === 'string' && VALID_TYPES.has(raw)) {
    return { type: raw as SchemaType, nullable: false }
  }

  return { type: 'unknown', nullable: false }
}

function extractConstraints(schema: RawSchema): SchemaConstraints | undefined {
  const constraints: SchemaConstraints = {}
  let hasConstraint = false

  const fields: (keyof SchemaConstraints)[] = [
    'minimum',
    'maximum',
    'minLength',
    'maxLength',
    'minItems',
    'maxItems',
    'pattern',
    'uniqueItems',
  ]

  for (const field of fields) {
    if (schema[field] !== undefined) {
      ;(constraints as Record<string, unknown>)[field] = schema[field]
      hasConstraint = true
    }
  }

  return hasConstraint ? constraints : undefined
}

function computeDisplayType(info: {
  type: SchemaType
  refName?: string
  items?: SchemaInfo
  oneOf?: readonly SchemaInfo[]
  anyOf?: readonly SchemaInfo[]
  allOf?: readonly SchemaInfo[]
  enumValues?: readonly string[]
}): string {
  if (info.refName) return info.refName

  if (info.enumValues && info.enumValues.length > 0) {
    return `enum(${info.enumValues.join(' | ')})`
  }

  if (info.type === 'array' && info.items) {
    return `${info.items.displayType}[]`
  }

  if (info.oneOf) {
    return info.oneOf.map((s) => s.displayType).join(' | ')
  }
  if (info.anyOf) {
    return info.anyOf.map((s) => s.displayType).join(' | ')
  }
  if (info.allOf) {
    return info.allOf.map((s) => s.displayType).join(' & ')
  }

  return info.type
}

export function transformSchema(
  schema: RawSchema,
  refName?: string,
  ancestors: WeakSet<object> = new WeakSet(),
): SchemaInfo {
  // Circular reference detection — track current recursion path, not global visitation
  if (ancestors.has(schema)) {
    return {
      type: 'unknown',
      nullable: false,
      readOnly: false,
      writeOnly: false,
      displayType: '[circular]',
    }
  }
  ancestors.add(schema)

  // Transform properties
  let properties: ReadonlyMap<string, SchemaInfo> | undefined
  if (schema.properties && typeof schema.properties === 'object') {
    const props = new Map<string, SchemaInfo>()
    for (const [key, value] of Object.entries(schema.properties as Record<string, unknown>)) {
      if (value && typeof value === 'object') {
        props.set(key, transformSchema(value as RawSchema, undefined, ancestors))
      }
    }
    properties = props
  }

  // Transform items
  let items: SchemaInfo | undefined
  if (schema.items && typeof schema.items === 'object') {
    items = transformSchema(schema.items as RawSchema, undefined, ancestors)
  }

  // Transform additionalProperties
  let additionalProperties: SchemaInfo | boolean | undefined
  if (schema.additionalProperties !== undefined) {
    if (typeof schema.additionalProperties === 'boolean') {
      additionalProperties = schema.additionalProperties
    } else if (typeof schema.additionalProperties === 'object' && schema.additionalProperties) {
      additionalProperties = transformSchema(
        schema.additionalProperties as RawSchema,
        undefined,
        ancestors,
      )
    }
  }

  // Transform composition
  const allOf = transformComposition(schema.allOf, ancestors)
  const oneOf = transformComposition(schema.oneOf, ancestors)
  const anyOf = transformComposition(schema.anyOf, ancestors)

  const { type, nullable: typeNullable } = resolveType(schema.type)
  const nullable = typeNullable || schema.nullable === true

  // Extract enum
  const enumValues = Array.isArray(schema.enum) ? schema.enum.map((v) => String(v)) : undefined

  const required = Array.isArray(schema.required) ? (schema.required as string[]) : undefined

  const constraints = extractConstraints(schema)

  const partial = {
    type,
    refName,
    items,
    oneOf,
    anyOf,
    allOf,
    enumValues,
  }

  const displayType = computeDisplayType(partial)

  // Remove from ancestors after processing — allows same object to appear
  // in sibling branches (shared schemas after dereferencing) without false
  // circular detection
  ancestors.delete(schema)

  return {
    type,
    format: typeof schema.format === 'string' ? schema.format : undefined,
    description: typeof schema.description === 'string' ? schema.description : undefined,
    nullable,
    readOnly: schema.readOnly === true,
    writeOnly: schema.writeOnly === true,
    enumValues,
    example: schema.example,
    defaultValue: schema.default,
    properties,
    required,
    additionalProperties,
    items,
    allOf,
    oneOf,
    anyOf,
    displayType,
    refName,
    constraints,
  }
}

function transformComposition(
  schemas: unknown,
  ancestors: WeakSet<object>,
): readonly SchemaInfo[] | undefined {
  if (!Array.isArray(schemas)) return undefined
  return schemas
    .filter((s): s is RawSchema => s !== null && typeof s === 'object')
    .map((s) => transformSchema(s, undefined, ancestors))
}

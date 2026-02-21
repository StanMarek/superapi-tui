export type SchemaType =
  | 'string'
  | 'number'
  | 'integer'
  | 'boolean'
  | 'array'
  | 'object'
  | 'null'
  | 'unknown'

export interface SchemaConstraints {
  readonly minimum?: number
  readonly maximum?: number
  readonly minLength?: number
  readonly maxLength?: number
  readonly minItems?: number
  readonly maxItems?: number
  readonly pattern?: string
  readonly uniqueItems?: boolean
}

export interface SchemaInfo {
  readonly type: SchemaType
  readonly format?: string
  readonly description?: string
  readonly nullable: boolean
  readonly readOnly: boolean
  readonly writeOnly: boolean
  readonly enumValues?: readonly string[]
  readonly example?: unknown
  readonly defaultValue?: unknown
  // Object properties
  readonly properties?: ReadonlyMap<string, SchemaInfo>
  readonly required?: readonly string[]
  readonly additionalProperties?: SchemaInfo | boolean
  // Array items
  readonly items?: SchemaInfo
  // Composition
  readonly allOf?: readonly SchemaInfo[]
  readonly oneOf?: readonly SchemaInfo[]
  readonly anyOf?: readonly SchemaInfo[]
  // Display helpers
  readonly displayType: string
  readonly refName?: string
  readonly constraints?: SchemaConstraints
}

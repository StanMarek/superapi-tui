import type { SchemaInfo } from './schema.js'

export interface MediaTypeInfo {
  readonly mediaType: string
  readonly schema?: SchemaInfo
  readonly example?: unknown
}

export interface RequestBodyInfo {
  readonly description?: string
  readonly required: boolean
  readonly content: readonly MediaTypeInfo[]
}

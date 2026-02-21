import type { SchemaInfo } from './schema.js'

export type ParameterLocation = 'path' | 'query' | 'header' | 'cookie'

export interface ParameterInfo {
  readonly name: string
  readonly location: ParameterLocation
  readonly required: boolean
  readonly description?: string
  readonly deprecated: boolean
  readonly schema?: SchemaInfo
  readonly example?: unknown
  readonly style?: string
  readonly explode?: boolean
}

import type { SchemaInfo } from './schema.js'
import type { MediaTypeInfo } from './request-body.js'

export interface ResponseHeaderInfo {
  readonly name: string
  readonly description?: string
  readonly schema?: SchemaInfo
  readonly required: boolean
}

export interface ResponseInfo {
  readonly statusCode: string
  readonly description: string
  readonly content: readonly MediaTypeInfo[]
  readonly headers: readonly ResponseHeaderInfo[]
}

import type { ParameterInfo } from './parameter.js'
import type { RequestBodyInfo } from './request-body.js'
import type { ResponseInfo } from './response.js'

export type HttpMethod =
  | 'get'
  | 'post'
  | 'put'
  | 'delete'
  | 'patch'
  | 'options'
  | 'head'
  | 'trace'

export interface SecurityRequirement {
  readonly name: string
  readonly scopes: readonly string[]
}

export interface Endpoint {
  readonly id: string
  readonly method: HttpMethod
  readonly path: string
  readonly summary?: string
  readonly description?: string
  readonly operationId?: string
  readonly tags: readonly string[]
  readonly deprecated: boolean
  readonly parameters: readonly ParameterInfo[]
  readonly requestBody?: RequestBodyInfo
  readonly responses: readonly ResponseInfo[]
  readonly security?: readonly SecurityRequirement[]
}

export interface TagGroup {
  readonly name: string
  readonly description?: string
  readonly endpoints: readonly Endpoint[]
}

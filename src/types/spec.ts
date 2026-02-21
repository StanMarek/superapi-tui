import type { Endpoint, TagGroup, SecurityRequirement } from './endpoint.js'
import type { SchemaInfo } from './schema.js'

export interface ServerVariable {
  readonly defaultValue: string
  readonly enumValues?: readonly string[]
  readonly description?: string
}

export interface ServerInfo {
  readonly url: string
  readonly description?: string
  readonly variables: ReadonlyMap<string, ServerVariable>
}

export interface SecuritySchemeInfo {
  readonly name: string
  readonly type: 'apiKey' | 'http' | 'oauth2' | 'openIdConnect'
  readonly scheme?: string
  readonly in?: 'query' | 'header' | 'cookie'
  readonly paramName?: string
  readonly description?: string
  readonly bearerFormat?: string
}

export interface SpecInfo {
  readonly title: string
  readonly version: string
  readonly description?: string
  readonly termsOfService?: string
  readonly contact?: {
    readonly name?: string
    readonly url?: string
    readonly email?: string
  }
  readonly license?: {
    readonly name: string
    readonly url?: string
  }
  readonly specVersion: string
}

export interface ParsedSpec {
  readonly info: SpecInfo
  readonly servers: readonly ServerInfo[]
  readonly tagGroups: readonly TagGroup[]
  readonly endpoints: readonly Endpoint[]
  readonly tags: readonly string[]
  readonly securitySchemes: readonly SecuritySchemeInfo[]
  readonly globalSecurity: readonly SecurityRequirement[]
  readonly componentSchemas: ReadonlyMap<string, SchemaInfo>
}

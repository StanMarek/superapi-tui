import type { SecuritySchemeInfo, AuthOption, AuthCredentials } from '@/types/index.js'

const FALLBACK_OPTIONS: readonly AuthOption[] = [
  { method: 'bearer', label: 'Bearer Token', schemeName: 'bearer' },
  { method: 'apiKey', label: 'API Key (header)', schemeName: 'apiKey', apiKeyIn: 'header', apiKeyParamName: 'X-API-Key' },
  { method: 'basic', label: 'Basic Auth', schemeName: 'basic' },
]

export interface DeriveAuthResult {
  readonly options: readonly AuthOption[]
  readonly unsupportedSchemes: readonly string[]
}

export function deriveAuthOptions(schemes: readonly SecuritySchemeInfo[]): DeriveAuthResult {
  const options: AuthOption[] = []
  const unsupportedSchemes: string[] = []

  for (const scheme of schemes) {
    if (scheme.type === 'http' && scheme.scheme === 'bearer') {
      options.push({
        method: 'bearer',
        label: `Bearer (${scheme.name})`,
        schemeName: scheme.name,
      })
    } else if (scheme.type === 'http' && scheme.scheme === 'basic') {
      options.push({
        method: 'basic',
        label: `Basic (${scheme.name})`,
        schemeName: scheme.name,
      })
    } else if (scheme.type === 'apiKey' && (scheme.in === 'header' || scheme.in === 'query')) {
      options.push({
        method: 'apiKey',
        label: `API Key ${scheme.in} (${scheme.name})`,
        schemeName: scheme.name,
        apiKeyIn: scheme.in,
        apiKeyParamName: scheme.paramName ?? scheme.name,
      })
    } else {
      unsupportedSchemes.push(`${scheme.name} (${scheme.type})`)
    }
  }

  return {
    options: options.length > 0 ? options : FALLBACK_OPTIONS,
    unsupportedSchemes,
  }
}

export interface ApplyAuthResult {
  readonly headers: ReadonlyMap<string, string>
  readonly queryParams: ReadonlyMap<string, string>
}

export function applyAuth(credentials: AuthCredentials): ApplyAuthResult {
  const headers = new Map<string, string>()
  const queryParams = new Map<string, string>()

  switch (credentials.method) {
    case 'none':
      break
    case 'bearer':
      if (credentials.token) {
        headers.set('Authorization', `Bearer ${credentials.token}`)
      }
      break
    case 'apiKey':
      if (credentials.key) {
        if (credentials.location === 'header') {
          headers.set(credentials.paramName, credentials.key)
        } else {
          queryParams.set(credentials.paramName, credentials.key)
        }
      }
      break
    case 'basic': {
      if (credentials.username || credentials.password) {
        const encoded = Buffer.from(`${credentials.username}:${credentials.password}`).toString('base64')
        headers.set('Authorization', `Basic ${encoded}`)
      }
      break
    }
    default: {
      const _exhaustive: never = credentials
      throw new Error(`Unsupported auth method: ${(_exhaustive as AuthCredentials).method}`)
    }
  }

  return { headers, queryParams }
}

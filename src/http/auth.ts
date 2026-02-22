import type { SecuritySchemeInfo, AuthOption, AuthCredentials } from '@/types/index.js'

const FALLBACK_OPTIONS: readonly AuthOption[] = [
  { method: 'bearer', label: 'Bearer Token', schemeName: 'bearer' },
  { method: 'apiKey', label: 'API Key (header)', schemeName: 'apiKey', apiKeyIn: 'header', apiKeyParamName: 'X-API-Key' },
  { method: 'basic', label: 'Basic Auth', schemeName: 'basic' },
]

export function deriveAuthOptions(schemes: readonly SecuritySchemeInfo[]): readonly AuthOption[] {
  const options: AuthOption[] = []

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
    }
  }

  return options.length > 0 ? options : FALLBACK_OPTIONS
}

export interface ApplyAuthResult {
  readonly headers: ReadonlyMap<string, string>
  readonly queryParams: ReadonlyMap<string, string>
}

export function applyAuth(credentials: AuthCredentials): ApplyAuthResult {
  const headers = new Map<string, string>()
  const queryParams = new Map<string, string>()

  switch (credentials.method) {
    case 'bearer':
      headers.set('Authorization', `Bearer ${credentials.token}`)
      break
    case 'apiKey':
      if (credentials.location === 'header') {
        headers.set(credentials.paramName, credentials.key)
      } else {
        queryParams.set(credentials.paramName, credentials.key)
      }
      break
    case 'basic': {
      const encoded = Buffer.from(`${credentials.username}:${credentials.password}`).toString('base64')
      headers.set('Authorization', `Basic ${encoded}`)
      break
    }
  }

  return { headers, queryParams }
}

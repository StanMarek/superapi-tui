import { describe, test, expect } from 'bun:test'
import { deriveAuthOptions, applyAuth } from '@/http/auth.js'
import type { SecuritySchemeInfo, AuthCredentials } from '@/types/index.js'

describe('deriveAuthOptions', () => {
  test('maps http bearer scheme to bearer option', () => {
    const schemes: SecuritySchemeInfo[] = [
      { name: 'bearerAuth', type: 'http', scheme: 'bearer' },
    ]
    const { options } = deriveAuthOptions(schemes)
    expect(options).toHaveLength(1)
    expect(options[0].method).toBe('bearer')
    expect(options[0].schemeName).toBe('bearerAuth')
    expect(options[0].label).toContain('Bearer')
  })

  test('maps http basic scheme to basic option', () => {
    const schemes: SecuritySchemeInfo[] = [
      { name: 'basicAuth', type: 'http', scheme: 'basic' },
    ]
    const { options } = deriveAuthOptions(schemes)
    expect(options).toHaveLength(1)
    expect(options[0].method).toBe('basic')
    expect(options[0].schemeName).toBe('basicAuth')
  })

  test('maps apiKey in header to apiKey option with correct params', () => {
    const schemes: SecuritySchemeInfo[] = [
      { name: 'apiKeyAuth', type: 'apiKey', in: 'header', paramName: 'X-API-Key' },
    ]
    const { options } = deriveAuthOptions(schemes)
    expect(options).toHaveLength(1)
    const opt = options[0]
    expect(opt.method).toBe('apiKey')
    if (opt.method === 'apiKey') {
      expect(opt.apiKeyIn).toBe('header')
      expect(opt.apiKeyParamName).toBe('X-API-Key')
    }
  })

  test('maps apiKey in query to apiKey option with correct params', () => {
    const schemes: SecuritySchemeInfo[] = [
      { name: 'queryKey', type: 'apiKey', in: 'query', paramName: 'api_key' },
    ]
    const { options } = deriveAuthOptions(schemes)
    expect(options).toHaveLength(1)
    const opt = options[0]
    expect(opt.method).toBe('apiKey')
    if (opt.method === 'apiKey') {
      expect(opt.apiKeyIn).toBe('query')
      expect(opt.apiKeyParamName).toBe('api_key')
    }
  })

  test('filters out oauth2 schemes and reports them as unsupported', () => {
    const schemes: SecuritySchemeInfo[] = [
      { name: 'oauth', type: 'oauth2' },
      { name: 'bearerAuth', type: 'http', scheme: 'bearer' },
    ]
    const { options, unsupportedSchemes } = deriveAuthOptions(schemes)
    expect(options).toHaveLength(1)
    expect(options[0].method).toBe('bearer')
    expect(unsupportedSchemes).toEqual(['oauth (oauth2)'])
  })

  test('filters out openIdConnect schemes and falls back', () => {
    const schemes: SecuritySchemeInfo[] = [
      { name: 'oidc', type: 'openIdConnect' },
    ]
    const { options, unsupportedSchemes } = deriveAuthOptions(schemes)
    expect(options).toHaveLength(3)
    expect(options[0].method).toBe('bearer')
    expect(unsupportedSchemes).toEqual(['oidc (openIdConnect)'])
  })

  test('filters out apiKey with in:cookie and falls back', () => {
    const schemes: SecuritySchemeInfo[] = [
      { name: 'cookieAuth', type: 'apiKey', in: 'cookie', paramName: 'session' },
    ]
    const { options, unsupportedSchemes } = deriveAuthOptions(schemes)
    expect(options).toHaveLength(3)
    expect(options[0].method).toBe('bearer')
    expect(unsupportedSchemes).toEqual(['cookieAuth (apiKey)'])
  })

  test('handles multiple supported schemes', () => {
    const schemes: SecuritySchemeInfo[] = [
      { name: 'bearerAuth', type: 'http', scheme: 'bearer' },
      { name: 'apiKeyAuth', type: 'apiKey', in: 'header', paramName: 'X-API-Key' },
      { name: 'basicAuth', type: 'http', scheme: 'basic' },
    ]
    const { options } = deriveAuthOptions(schemes)
    expect(options).toHaveLength(3)
    expect(options.map(o => o.method)).toEqual(['bearer', 'apiKey', 'basic'])
  })

  test('falls back to all 3 generic options when no schemes provided', () => {
    const { options, unsupportedSchemes } = deriveAuthOptions([])
    expect(options).toHaveLength(3)
    expect(options[0].method).toBe('bearer')
    expect(options[1].method).toBe('apiKey')
    expect(options[2].method).toBe('basic')
    expect(unsupportedSchemes).toHaveLength(0)
  })

  test('falls back to all 3 generic options when all schemes are unsupported', () => {
    const schemes: SecuritySchemeInfo[] = [
      { name: 'oauth', type: 'oauth2' },
      { name: 'oidc', type: 'openIdConnect' },
    ]
    const { options, unsupportedSchemes } = deriveAuthOptions(schemes)
    expect(options).toHaveLength(3)
    expect(options[0].method).toBe('bearer')
    expect(unsupportedSchemes).toEqual(['oauth (oauth2)', 'oidc (openIdConnect)'])
  })

  test('label includes scheme name for spec-derived options', () => {
    const schemes: SecuritySchemeInfo[] = [
      { name: 'myBearerAuth', type: 'http', scheme: 'bearer' },
    ]
    const { options } = deriveAuthOptions(schemes)
    expect(options[0].label).toContain('myBearerAuth')
  })

  test('fallback apiKey option has default header location and param name', () => {
    const { options } = deriveAuthOptions([])
    const apiKeyOption = options.find(o => o.method === 'apiKey')
    expect(apiKeyOption).toBeDefined()
    if (apiKeyOption?.method === 'apiKey') {
      expect(apiKeyOption.apiKeyIn).toBe('header')
      expect(apiKeyOption.apiKeyParamName).toBe('X-API-Key')
    }
  })
})

describe('applyAuth', () => {
  test('none credentials returns empty maps', () => {
    const result = applyAuth({ method: 'none' })
    expect(result.headers.size).toBe(0)
    expect(result.queryParams.size).toBe(0)
  })

  test('bearer credentials set Authorization header', () => {
    const creds: AuthCredentials = { method: 'bearer', token: 'my-token-123' }
    const result = applyAuth(creds)
    expect(result.headers.get('Authorization')).toBe('Bearer my-token-123')
    expect(result.queryParams.size).toBe(0)
  })

  test('bearer with empty token skips header', () => {
    const creds: AuthCredentials = { method: 'bearer', token: '' }
    const result = applyAuth(creds)
    expect(result.headers.size).toBe(0)
  })

  test('apiKey with empty key skips header and query param', () => {
    const creds: AuthCredentials = { method: 'apiKey', key: '', paramName: 'X-API-Key', location: 'header' }
    const result = applyAuth(creds)
    expect(result.headers.size).toBe(0)
    expect(result.queryParams.size).toBe(0)
  })

  test('apiKey in header sets custom header', () => {
    const creds: AuthCredentials = {
      method: 'apiKey',
      key: 'secret-key',
      paramName: 'X-API-Key',
      location: 'header',
    }
    const result = applyAuth(creds)
    expect(result.headers.get('X-API-Key')).toBe('secret-key')
    expect(result.queryParams.size).toBe(0)
  })

  test('apiKey in query sets query param', () => {
    const creds: AuthCredentials = {
      method: 'apiKey',
      key: 'secret-key',
      paramName: 'api_key',
      location: 'query',
    }
    const result = applyAuth(creds)
    expect(result.headers.size).toBe(0)
    expect(result.queryParams.get('api_key')).toBe('secret-key')
  })

  test('basic credentials set base64 Authorization header', () => {
    const creds: AuthCredentials = {
      method: 'basic',
      username: 'user',
      password: 'pass',
    }
    const result = applyAuth(creds)
    const expected = Buffer.from('user:pass').toString('base64')
    expect(result.headers.get('Authorization')).toBe(`Basic ${expected}`)
    expect(result.queryParams.size).toBe(0)
  })

  test('basic credentials with both empty skips header', () => {
    const creds: AuthCredentials = { method: 'basic', username: '', password: '' }
    const result = applyAuth(creds)
    expect(result.headers.size).toBe(0)
  })

  test('basic credentials with only username sets header', () => {
    const creds: AuthCredentials = { method: 'basic', username: 'user', password: '' }
    const result = applyAuth(creds)
    const expected = Buffer.from('user:').toString('base64')
    expect(result.headers.get('Authorization')).toBe(`Basic ${expected}`)
  })

  test('basic credentials with only password sets header', () => {
    const creds: AuthCredentials = { method: 'basic', username: '', password: 'pass' }
    const result = applyAuth(creds)
    const expected = Buffer.from(':pass').toString('base64')
    expect(result.headers.get('Authorization')).toBe(`Basic ${expected}`)
  })

  test('basic credentials handle special characters', () => {
    const creds: AuthCredentials = {
      method: 'basic',
      username: 'user@example.com',
      password: 'p@ss:word!',
    }
    const result = applyAuth(creds)
    const expected = Buffer.from('user@example.com:p@ss:word!').toString('base64')
    expect(result.headers.get('Authorization')).toBe(`Basic ${expected}`)
  })
})

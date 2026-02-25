import { describe, test, expect } from 'bun:test'
import { matchServerAuth } from '@/config/match.js'
import type { SavedServer } from '@/config/types.js'

describe('matchServerAuth', () => {
  test('returns null for empty servers', () => {
    const result = matchServerAuth([], 'https://api.example.com')
    expect(result).toBeNull()
  })

  test('returns auth for exact match', () => {
    const servers: readonly SavedServer[] = [
      { name: 'prod', url: 'https://api.example.com', auth: { method: 'bearer', token: 'abc' } },
    ]

    const result = matchServerAuth(servers, 'https://api.example.com')

    expect(result).toEqual({ method: 'bearer', token: 'abc' })
  })

  test('matches despite trailing slash difference (saved has slash)', () => {
    const servers: readonly SavedServer[] = [
      { name: 'prod', url: 'https://api.example.com/', auth: { method: 'bearer', token: 'abc' } },
    ]

    const result = matchServerAuth(servers, 'https://api.example.com')

    expect(result).toEqual({ method: 'bearer', token: 'abc' })
  })

  test('matches despite trailing slash difference (spec has slash)', () => {
    const servers: readonly SavedServer[] = [
      { name: 'prod', url: 'https://api.example.com', auth: { method: 'bearer', token: 'abc' } },
    ]

    const result = matchServerAuth(servers, 'https://api.example.com/')

    expect(result).toEqual({ method: 'bearer', token: 'abc' })
  })

  test('matches case-insensitively', () => {
    const servers: readonly SavedServer[] = [
      { name: 'prod', url: 'https://API.Example.COM', auth: { method: 'basic', username: 'u', password: 'p' } },
    ]

    const result = matchServerAuth(servers, 'https://api.example.com')

    expect(result).toEqual({ method: 'basic', username: 'u', password: 'p' })
  })

  test('returns null when no match', () => {
    const servers: readonly SavedServer[] = [
      { name: 'prod', url: 'https://api.example.com', auth: { method: 'bearer', token: 'abc' } },
    ]

    const result = matchServerAuth(servers, 'https://other.example.com')

    expect(result).toBeNull()
  })

  test('returns null when server has no auth', () => {
    const servers: readonly SavedServer[] = [
      { name: 'prod', url: 'https://api.example.com' },
    ]

    const result = matchServerAuth(servers, 'https://api.example.com')

    expect(result).toBeNull()
  })

  test('returns first matching server auth', () => {
    const servers: readonly SavedServer[] = [
      { name: 'first', url: 'https://api.example.com', auth: { method: 'bearer', token: 'first-token' } },
      { name: 'second', url: 'https://api.example.com', auth: { method: 'bearer', token: 'second-token' } },
    ]

    const result = matchServerAuth(servers, 'https://api.example.com')

    expect(result).toEqual({ method: 'bearer', token: 'first-token' })
  })

  test('handles multiple trailing slashes', () => {
    const servers: readonly SavedServer[] = [
      { name: 'prod', url: 'https://api.example.com///', auth: { method: 'bearer', token: 'abc' } },
    ]

    const result = matchServerAuth(servers, 'https://api.example.com')

    expect(result).toEqual({ method: 'bearer', token: 'abc' })
  })

  test('does not match different paths', () => {
    const servers: readonly SavedServer[] = [
      { name: 'prod', url: 'https://api.example.com/v1', auth: { method: 'bearer', token: 'abc' } },
    ]

    const result = matchServerAuth(servers, 'https://api.example.com/v2')

    expect(result).toBeNull()
  })

  test('returns apiKey auth for matching server', () => {
    const servers: readonly SavedServer[] = [
      { name: 'prod', url: 'https://api.example.com', auth: { method: 'apiKey', key: 'secret', paramName: 'X-API-Key', location: 'header' } },
    ]

    const result = matchServerAuth(servers, 'https://api.example.com')

    expect(result).toEqual({ method: 'apiKey', key: 'secret', paramName: 'X-API-Key', location: 'header' })
  })

  test('skips servers without url field', () => {
    const servers: readonly SavedServer[] = [
      { name: 'swagger-only', swaggerEndpointUrl: 'https://api.example.com/docs' },
    ]

    const result = matchServerAuth(servers, 'https://api.example.com')

    expect(result).toBeNull()
  })

  test('matches server with url when swaggerEndpointUrl also present', () => {
    const servers: readonly SavedServer[] = [
      {
        name: 'full',
        swaggerEndpointUrl: 'https://api.example.com/docs',
        url: 'https://api.example.com',
        auth: { method: 'bearer', token: 'abc' },
      },
    ]

    const result = matchServerAuth(servers, 'https://api.example.com')

    expect(result).toEqual({ method: 'bearer', token: 'abc' })
  })

  test('does not match swaggerEndpointUrl — only matches url', () => {
    const servers: readonly SavedServer[] = [
      {
        name: 'full',
        swaggerEndpointUrl: 'https://api.example.com/docs',
        url: 'https://api.example.com',
        auth: { method: 'bearer', token: 'abc' },
      },
    ]

    const result = matchServerAuth(servers, 'https://api.example.com/docs')

    expect(result).toBeNull()
  })
})

import { afterEach, describe, expect, mock, test } from 'bun:test'
import { resolveServerUrl, buildRequestUrl, validateSsrf, sendRequest } from '@/http/client.js'
import { HttpRequestError } from '@/types/index.js'
import type { ServerInfo, RequestOptions } from '@/types/index.js'

describe('resolveServerUrl', () => {
  test('replaces variables with default values', () => {
    const server: ServerInfo = {
      url: 'https://{host}:{port}/api/{version}',
      variables: new Map([
        ['host', { defaultValue: 'api.example.com' }],
        ['port', { defaultValue: '8443' }],
        ['version', { defaultValue: 'v2' }],
      ]),
    }

    expect(resolveServerUrl(server)).toBe('https://api.example.com:8443/api/v2')
  })

  test('keeps token when variable not found', () => {
    const server: ServerInfo = {
      url: 'https://{host}/{unknown}',
      variables: new Map([['host', { defaultValue: 'example.com' }]]),
    }

    expect(resolveServerUrl(server)).toBe('https://example.com/{unknown}')
  })

  test('returns url as-is when no variables present', () => {
    const server: ServerInfo = {
      url: 'https://api.example.com/v1',
      variables: new Map(),
    }

    expect(resolveServerUrl(server)).toBe('https://api.example.com/v1')
  })
})

describe('buildRequestUrl', () => {
  test('substitutes path params with encoded values', () => {
    const result = buildRequestUrl(
      'https://api.example.com',
      '/pets/{petId}/toys/{toyId}',
      new Map([
        ['petId', '42'],
        ['toyId', '7'],
      ]),
    )

    expect(result).toBe('https://api.example.com/pets/42/toys/7')
  })

  test('removes duplicate slash between server url and path', () => {
    const result = buildRequestUrl(
      'https://api.example.com/',
      '/pets',
      new Map(),
    )

    expect(result).toBe('https://api.example.com/pets')
  })

  test('URL-encodes param values', () => {
    const result = buildRequestUrl(
      'https://api.example.com',
      '/search/{query}',
      new Map([['query', 'hello world/foo']]),
    )

    expect(result).toBe('https://api.example.com/search/hello%20world%2Ffoo')
  })
})

describe('validateSsrf', () => {
  test('allows https URLs', () => {
    expect(() => validateSsrf('https://api.example.com/v1')).not.toThrow()
    expect(() => validateSsrf('https://internal.corp.net:8443/api')).not.toThrow()
  })

  test('allows http://localhost', () => {
    expect(() => validateSsrf('http://localhost:3000/api')).not.toThrow()
    expect(() => validateSsrf('http://localhost/api')).not.toThrow()
  })

  test('allows http://127.0.0.1', () => {
    expect(() => validateSsrf('http://127.0.0.1:8080/api')).not.toThrow()
    expect(() => validateSsrf('http://[::1]:8080/api')).not.toThrow()
  })

  test('rejects http:// to non-localhost hosts', () => {
    expect(() => validateSsrf('http://api.example.com/v1')).toThrow(HttpRequestError)
    expect(() => validateSsrf('http://192.168.1.1/admin')).toThrow(HttpRequestError)
    expect(() => validateSsrf('http://10.0.0.1/internal')).toThrow(HttpRequestError)
  })

  test('rejects non-http/https protocols', () => {
    expect(() => validateSsrf('ftp://example.com/file')).toThrow(HttpRequestError)
    expect(() => validateSsrf('file:///etc/passwd')).toThrow(HttpRequestError)
  })
})

describe('sendRequest', () => {
  afterEach(() => {
    mock.restore()
  })

  test('returns HttpResponse with timing', async () => {
    globalThis.fetch = mock(() =>
      Promise.resolve(
        new Response('{"ok":true}', {
          status: 200,
          statusText: 'OK',
          headers: { 'content-type': 'application/json' },
        }),
      ),
    ) as unknown as typeof fetch

    const options: RequestOptions = {
      method: 'get',
      url: 'https://api.example.com/pets',
      headers: new Map([['accept', 'application/json']]),
    }

    const result = await sendRequest(options)

    expect(result.status).toBe(200)
    expect(result.statusText).toBe('OK')
    expect(result.body).toBe('{"ok":true}')
    expect(result.headers.get('content-type')).toBe('application/json')
    expect(result.durationMs).toBeGreaterThanOrEqual(0)
  })

  test('wraps network errors in HttpRequestError', async () => {
    globalThis.fetch = mock(() =>
      Promise.reject(new TypeError('Failed to fetch')),
    ) as unknown as typeof fetch

    const options: RequestOptions = {
      method: 'get',
      url: 'https://api.example.com/pets',
      headers: new Map(),
    }

    await expect(sendRequest(options)).rejects.toBeInstanceOf(HttpRequestError)

    try {
      await sendRequest(options)
    } catch (error) {
      expect(error).toBeInstanceOf(HttpRequestError)
      expect((error as HttpRequestError).cause).toBeInstanceOf(TypeError)
    }
  })
})

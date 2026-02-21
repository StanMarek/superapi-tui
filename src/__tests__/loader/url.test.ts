import { afterEach, describe, expect, mock, test } from 'bun:test'
import { loadFromUrl } from '@/loader/url.js'
import { SpecLoadError } from '@/types/index.js'

describe('loadFromUrl', () => {
  afterEach(() => {
    mock.restore()
  })

  test('fetches and returns JSON spec', async () => {
    const specContent = '{"openapi":"3.0.0","info":{"title":"Test","version":"1.0"},"paths":{}}'
    globalThis.fetch = mock(() =>
      Promise.resolve(new Response(specContent, { status: 200 })),
    ) as unknown as typeof fetch

    const result = await loadFromUrl('https://example.com/spec.json')
    expect(result.content).toBe(specContent)
    expect(result.format).toBe('json')
    expect(result.inputType).toBe('url')
  })

  test('throws SpecLoadError on non-OK status', async () => {
    globalThis.fetch = mock(() =>
      Promise.resolve(new Response('Not Found', { status: 404 })),
    ) as unknown as typeof fetch

    await expect(loadFromUrl('https://example.com/missing')).rejects.toBeInstanceOf(SpecLoadError)
  })

  test('throws SpecLoadError on network failure', async () => {
    globalThis.fetch = mock(() =>
      Promise.reject(new Error('Network error')),
    ) as unknown as typeof fetch

    await expect(loadFromUrl('https://example.com/fail')).rejects.toBeInstanceOf(SpecLoadError)
  })

  test('rejects non-http/https protocols', async () => {
    await expect(loadFromUrl('file:///etc/passwd')).rejects.toThrow(/Unsupported protocol/)
    await expect(loadFromUrl('ftp://example.com/spec')).rejects.toThrow(/Unsupported protocol/)
  })
})

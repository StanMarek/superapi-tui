import { describe, expect, test } from 'bun:test'
import { readFileSync } from 'fs'
import { join } from 'path'
import {
  isSwaggerUiPage,
  extractSpecUrl,
  extractConfigUrl,
  extractExternalScriptUrls,
  isSameOrigin,
  parseSwaggerConfig,
  resolveSpecUrlFromConfig,
} from '@/loader/swagger-ui.js'

const FIXTURES = join(import.meta.dir, '../fixtures')
const swaggerHtml = readFileSync(join(FIXTURES, 'swagger-ui.html'), 'utf8')

describe('isSwaggerUiPage', () => {
  test('returns true for Swagger UI HTML', () => {
    expect(isSwaggerUiPage(swaggerHtml)).toBe(true)
  })

  test('returns false for JSON content', () => {
    expect(isSwaggerUiPage('{"openapi":"3.0.0"}')).toBe(false)
  })

  test('returns false for YAML content', () => {
    expect(isSwaggerUiPage('openapi: "3.0.0"')).toBe(false)
  })
})

describe('extractSpecUrl', () => {
  test('extracts URL from SwaggerUIBundle config', () => {
    const url = extractSpecUrl(swaggerHtml, 'https://example.com/swagger-ui/index.html')
    expect(url).toBeTruthy()
    expect(url).toContain('/v3/api-docs')
  })

  test('resolves relative URLs against base', () => {
    const html = '<script>SwaggerUIBundle({ url: "/api/docs" })</script>'
    const url = extractSpecUrl(html, 'https://example.com/swagger-ui/')
    expect(url).toBe('https://example.com/api/docs')
  })

  test('returns null when no spec URL found', () => {
    expect(extractSpecUrl('<html><body>Hello</body></html>', 'https://example.com')).toBeNull()
  })
})

describe('extractConfigUrl', () => {
  test('extracts configUrl from JS content with single quotes', () => {
    const js = `SwaggerUIBundle({ configUrl: '/v3/api-docs/swagger-config', dom_id: '#swagger-ui' })`
    const url = extractConfigUrl(js, 'https://example.com/swagger-ui/index.html')
    expect(url).toBe('https://example.com/v3/api-docs/swagger-config')
  })

  test('extracts configUrl from JS content with double quotes', () => {
    const js = `SwaggerUIBundle({ configUrl: "/v3/api-docs/swagger-config" })`
    const url = extractConfigUrl(js, 'https://example.com/')
    expect(url).toBe('https://example.com/v3/api-docs/swagger-config')
  })

  test('extracts configUrl from JS content with backticks', () => {
    const js = 'SwaggerUIBundle({ configUrl: `/v3/api-docs/swagger-config` })'
    const url = extractConfigUrl(js, 'https://example.com/')
    expect(url).toBe('https://example.com/v3/api-docs/swagger-config')
  })

  test('resolves absolute configUrl', () => {
    const js = `configUrl: "https://api.example.com/config"`
    const url = extractConfigUrl(js, 'https://example.com/')
    expect(url).toBe('https://api.example.com/config')
  })

  test('returns null when no configUrl found', () => {
    expect(extractConfigUrl('const x = 42;', 'https://example.com')).toBeNull()
  })
})

describe('extractExternalScriptUrls', () => {
  test('extracts script src URLs from HTML', () => {
    const html = `
      <script src="https://cdn.example.com/bundle.js"></script>
      <script src="/swagger-initializer.js"></script>
      <script>inline code</script>
    `
    const urls = extractExternalScriptUrls(html, 'https://example.com/swagger-ui/index.html')
    expect(urls).toHaveLength(2)
    expect(urls[0]).toBe('https://cdn.example.com/bundle.js')
    expect(urls[1]).toBe('https://example.com/swagger-initializer.js')
  })

  test('resolves relative script URLs against base', () => {
    const html = `<script src="./init.js"></script>`
    const urls = extractExternalScriptUrls(html, 'https://example.com/swagger-ui/index.html')
    expect(urls).toHaveLength(1)
    expect(urls[0]).toBe('https://example.com/swagger-ui/init.js')
  })

  test('returns empty array for no external scripts', () => {
    const html = '<script>const x = 1;</script>'
    const urls = extractExternalScriptUrls(html, 'https://example.com/')
    expect(urls).toHaveLength(0)
  })

  test('handles multiple calls without state leaking', () => {
    const html = `<script src="/a.js"></script>`
    const base = 'https://example.com/'
    const urls1 = extractExternalScriptUrls(html, base)
    const urls2 = extractExternalScriptUrls(html, base)
    expect(urls1).toEqual(urls2)
  })
})

describe('isSameOrigin', () => {
  test('returns true for same origin', () => {
    expect(isSameOrigin('https://example.com/foo', 'https://example.com/bar')).toBe(true)
  })

  test('returns false for different origin', () => {
    expect(isSameOrigin('https://cdn.example.com/foo', 'https://example.com/bar')).toBe(false)
  })

  test('returns false for different protocol', () => {
    expect(isSameOrigin('http://example.com/foo', 'https://example.com/bar')).toBe(false)
  })

  test('returns false for different port', () => {
    expect(isSameOrigin('https://example.com:8080/foo', 'https://example.com/bar')).toBe(false)
  })

  test('returns false for invalid URLs', () => {
    expect(isSameOrigin('not-a-url', 'https://example.com')).toBe(false)
  })
})

describe('parseSwaggerConfig', () => {
  test('parses config with url field', () => {
    const json = JSON.stringify({ url: '/v3/api-docs/Api' })
    const config = parseSwaggerConfig(json, 'https://example.com/config')
    expect(config.url).toBe('https://example.com/v3/api-docs/Api')
  })

  test('parses config with urls array', () => {
    const json = JSON.stringify({
      urls: [
        { url: '/v3/api-docs/Api', name: 'Api' },
        { url: '/v3/api-docs/Admin', name: 'Admin' },
      ],
    })
    const config = parseSwaggerConfig(json, 'https://example.com/config')
    expect(config.urls).toHaveLength(2)
    expect(config.urls![0].url).toBe('https://example.com/v3/api-docs/Api')
    expect(config.urls![0].name).toBe('Api')
    expect(config.urls![1].url).toBe('https://example.com/v3/api-docs/Admin')
  })

  test('parses config with both url and urls', () => {
    const json = JSON.stringify({
      url: '/v3/api-docs',
      urls: [{ url: '/v3/api-docs/Api' }],
    })
    const config = parseSwaggerConfig(json, 'https://example.com/')
    expect(config.url).toBe('https://example.com/v3/api-docs')
    expect(config.urls).toHaveLength(1)
  })

  test('handles config with no url fields', () => {
    const json = JSON.stringify({ validatorUrl: null })
    const config = parseSwaggerConfig(json, 'https://example.com/')
    expect(config.url).toBeUndefined()
    expect(config.urls).toBeUndefined()
  })

  test('filters invalid entries from urls array', () => {
    const json = JSON.stringify({
      urls: [{ url: '/valid' }, null, { name: 'no-url' }, 42],
    })
    const config = parseSwaggerConfig(json, 'https://example.com/')
    expect(config.urls).toHaveLength(1)
    expect(config.urls![0].url).toBe('https://example.com/valid')
  })

  test('resolves absolute URLs in config', () => {
    const json = JSON.stringify({ url: 'https://api.example.com/v3/docs' })
    const config = parseSwaggerConfig(json, 'https://example.com/config')
    expect(config.url).toBe('https://api.example.com/v3/docs')
  })
})

describe('resolveSpecUrlFromConfig', () => {
  test('prefers url over urls', () => {
    const url = resolveSpecUrlFromConfig({
      url: 'https://example.com/docs',
      urls: [{ url: 'https://example.com/other' }],
    })
    expect(url).toBe('https://example.com/docs')
  })

  test('falls back to first urls entry', () => {
    const url = resolveSpecUrlFromConfig({
      urls: [
        { url: 'https://example.com/first', name: 'First' },
        { url: 'https://example.com/second', name: 'Second' },
      ],
    })
    expect(url).toBe('https://example.com/first')
  })

  test('returns null when no url available', () => {
    expect(resolveSpecUrlFromConfig({})).toBeNull()
  })

  test('returns null for empty urls array', () => {
    expect(resolveSpecUrlFromConfig({ urls: [] })).toBeNull()
  })
})

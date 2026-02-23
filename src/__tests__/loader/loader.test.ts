import { afterEach, describe, expect, mock, test } from 'bun:test'
import { join } from 'path'
import { loadSpec } from '@/loader/index.js'
import { SpecLoadError } from '@/types/index.js'

const FIXTURES = join(import.meta.dir, '../fixtures')

describe('loadSpec', () => {
  test('loads a local YAML file', async () => {
    const result = await loadSpec(join(FIXTURES, 'petstore-3.0.yaml'))
    expect(result.inputType).toBe('file')
    expect(result.format).toBe('yaml')
    expect(result.content).toContain('openapi')
  })

  test('loads a local JSON file', async () => {
    const result = await loadSpec(join(FIXTURES, 'minimal-spec.json'))
    expect(result.inputType).toBe('file')
    expect(result.format).toBe('json')
  })

  test('throws for nonexistent file', async () => {
    await expect(loadSpec('/no/such/file.yaml')).rejects.toBeInstanceOf(SpecLoadError)
  })
})

describe('loadSpec — Swagger UI configUrl flow', () => {
  const originalFetch = globalThis.fetch

  afterEach(() => {
    globalThis.fetch = originalFetch
  })

  test('resolves spec via configUrl in external script', async () => {
    const pageUrl = 'https://app.example.com/swagger-ui/index.html'
    const specContent = '{"openapi":"3.0.0","info":{"title":"Test","version":"1.0"},"paths":{}}'

    // HTML has no inline url — only an external same-origin script
    const swaggerHtml = `<!DOCTYPE html>
<html>
<head><title>Swagger UI</title></head>
<body>
  <div id="swagger-ui"></div>
  <script src="https://cdn.other.com/swagger-ui-bundle.js"></script>
  <script src="/swagger-initializer.js"></script>
</body>
</html>`

    // External script has configUrl (and a petstore url default)
    const initializerJs = `
window.ui = SwaggerUIBundle({
  url: "https://petstore.swagger.io/v2/swagger.json",
  configUrl: "/v3/api-docs/swagger-config",
  dom_id: '#swagger-ui',
  layout: "StandaloneLayout"
});`

    // Config endpoint returns spec URL
    const configJson = JSON.stringify({
      urls: [
        { url: '/v3/api-docs/Api', name: 'Api' },
        { url: '/v3/api-docs/Admin', name: 'Admin' },
      ],
    })

    globalThis.fetch = mock((url: string | URL | Request) => {
      const urlStr = typeof url === 'string' ? url : url instanceof URL ? url.toString() : url.url
      if (urlStr === pageUrl) {
        return Promise.resolve(new Response(swaggerHtml, { status: 200 }))
      }
      if (urlStr === 'https://app.example.com/swagger-initializer.js') {
        return Promise.resolve(new Response(initializerJs, { status: 200 }))
      }
      if (urlStr === 'https://app.example.com/v3/api-docs/swagger-config') {
        return Promise.resolve(new Response(configJson, { status: 200 }))
      }
      if (urlStr === 'https://app.example.com/v3/api-docs/Api') {
        return Promise.resolve(new Response(specContent, { status: 200 }))
      }
      return Promise.resolve(new Response('Not Found', { status: 404 }))
    }) as unknown as typeof fetch

    const result = await loadSpec(pageUrl)
    expect(result.content).toBe(specContent)
    expect(result.resolvedUrl).toBe('https://app.example.com/v3/api-docs/Api')
  })

  test('skips cross-origin scripts', async () => {
    const pageUrl = 'https://app.example.com/swagger-ui/index.html'

    // HTML only has cross-origin scripts (CDN) — no same-origin ones
    const swaggerHtml = `<!DOCTYPE html>
<html>
<body>
  <div id="swagger-ui"></div>
  <script src="https://cdn.other.com/swagger-ui-bundle.js"></script>
</body>
</html>`

    globalThis.fetch = mock((url: string | URL | Request) => {
      const urlStr = typeof url === 'string' ? url : url instanceof URL ? url.toString() : url.url
      if (urlStr === pageUrl) {
        return Promise.resolve(new Response(swaggerHtml, { status: 200 }))
      }
      return Promise.resolve(new Response('Not Found', { status: 404 }))
    }) as unknown as typeof fetch

    await expect(loadSpec(pageUrl)).rejects.toBeInstanceOf(SpecLoadError)
  })

  test('resolves spec via inline configUrl in HTML', async () => {
    const pageUrl = 'https://app.example.com/swagger-ui/index.html'
    const specContent = '{"openapi":"3.0.0","info":{"title":"Inline","version":"1.0"},"paths":{}}'

    // HTML has inline configUrl (not url)
    const swaggerHtml = `<!DOCTYPE html>
<html>
<body>
  <div id="swagger-ui-container"></div>
  <script>
    SwaggerUIBundle({
      configUrl: "/v3/api-docs/swagger-config",
      dom_id: '#swagger-ui-container'
    })
  </script>
</body>
</html>`

    const configJson = JSON.stringify({ url: '/v3/api-docs' })

    globalThis.fetch = mock((url: string | URL | Request) => {
      const urlStr = typeof url === 'string' ? url : url instanceof URL ? url.toString() : url.url
      if (urlStr === pageUrl) {
        return Promise.resolve(new Response(swaggerHtml, { status: 200 }))
      }
      if (urlStr === 'https://app.example.com/v3/api-docs/swagger-config') {
        return Promise.resolve(new Response(configJson, { status: 200 }))
      }
      if (urlStr === 'https://app.example.com/v3/api-docs') {
        return Promise.resolve(new Response(specContent, { status: 200 }))
      }
      return Promise.resolve(new Response('Not Found', { status: 404 }))
    }) as unknown as typeof fetch

    const result = await loadSpec(pageUrl)
    expect(result.content).toBe(specContent)
    expect(result.resolvedUrl).toBe('https://app.example.com/v3/api-docs')
  })

  test('prefers inline url over configUrl', async () => {
    const pageUrl = 'https://app.example.com/swagger-ui/index.html'
    const specContent = '{"openapi":"3.0.0","info":{"title":"Direct","version":"1.0"},"paths":{}}'

    // HTML has both inline url and configUrl — url should win (fastest path)
    const swaggerHtml = `<!DOCTYPE html>
<html>
<body>
  <div id="swagger-ui"></div>
  <script>
    SwaggerUIBundle({
      url: "/v3/api-docs/direct",
      configUrl: "/v3/api-docs/swagger-config",
      dom_id: '#swagger-ui'
    })
  </script>
</body>
</html>`

    globalThis.fetch = mock((url: string | URL | Request) => {
      const urlStr = typeof url === 'string' ? url : url instanceof URL ? url.toString() : url.url
      if (urlStr === pageUrl) {
        return Promise.resolve(new Response(swaggerHtml, { status: 200 }))
      }
      if (urlStr === 'https://app.example.com/v3/api-docs/direct') {
        return Promise.resolve(new Response(specContent, { status: 200 }))
      }
      return Promise.resolve(new Response('Not Found', { status: 404 }))
    }) as unknown as typeof fetch

    const result = await loadSpec(pageUrl)
    expect(result.content).toBe(specContent)
    expect(result.resolvedUrl).toBe('https://app.example.com/v3/api-docs/direct')
  })

  test('skips url fallback when configUrl present but unresolved in external script', async () => {
    const pageUrl = 'https://app.example.com/swagger-ui/index.html'

    // HTML has no inline url/configUrl — only external script
    const swaggerHtml = `<!DOCTYPE html>
<html>
<body>
  <div id="swagger-ui"></div>
  <script src="/swagger-initializer.js"></script>
</body>
</html>`

    // External script has both configUrl and a petstore url default
    // Config endpoint fails (404) — should NOT fall back to petstore url
    const initializerJs = `
window.ui = SwaggerUIBundle({
  url: "https://petstore.swagger.io/v2/swagger.json",
  configUrl: "/v3/api-docs/swagger-config",
  dom_id: '#swagger-ui'
});`

    globalThis.fetch = mock((url: string | URL | Request) => {
      const urlStr = typeof url === 'string' ? url : url instanceof URL ? url.toString() : url.url
      if (urlStr === pageUrl) {
        return Promise.resolve(new Response(swaggerHtml, { status: 200 }))
      }
      if (urlStr === 'https://app.example.com/swagger-initializer.js') {
        return Promise.resolve(new Response(initializerJs, { status: 200 }))
      }
      // Config endpoint returns 404
      return Promise.resolve(new Response('Not Found', { status: 404 }))
    }) as unknown as typeof fetch

    // Should fail rather than loading petstore
    await expect(loadSpec(pageUrl)).rejects.toBeInstanceOf(SpecLoadError)
  })
})

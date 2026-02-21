import { describe, expect, test } from 'bun:test'
import { readFileSync } from 'fs'
import { join } from 'path'
import { isSwaggerUiPage, extractSpecUrl } from '@/loader/swagger-ui.js'

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

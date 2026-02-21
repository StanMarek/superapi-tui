import { describe, expect, test } from 'bun:test'
import { isUrl, resolveUrl } from '@/utils/url.js'

describe('isUrl', () => {
  test('returns true for https URLs', () => {
    expect(isUrl('https://example.com/spec.json')).toBe(true)
  })

  test('returns true for http URLs', () => {
    expect(isUrl('http://localhost:8080/api-docs')).toBe(true)
  })

  test('returns false for file paths', () => {
    expect(isUrl('./openapi.yaml')).toBe(false)
    expect(isUrl('/absolute/path.json')).toBe(false)
    expect(isUrl('relative/path.yml')).toBe(false)
  })

  test('returns false for empty string', () => {
    expect(isUrl('')).toBe(false)
  })
})

describe('resolveUrl', () => {
  test('returns absolute URLs unchanged', () => {
    expect(resolveUrl('https://example.com/spec.json', 'https://base.com')).toBe(
      'https://example.com/spec.json',
    )
  })

  test('resolves relative URLs against base', () => {
    const result = resolveUrl('/v3/api-docs', 'https://example.com/swagger-ui/index.html')
    expect(result).toBe('https://example.com/v3/api-docs')
  })
})

import { describe, expect, test } from 'bun:test'
import { detectInputType, detectSpecFormat } from '@/loader/detect.js'

describe('detectInputType', () => {
  test('returns file for relative paths', () => {
    expect(detectInputType('./openapi.yaml')).toBe('file')
    expect(detectInputType('relative/path.yml')).toBe('file')
  })

  test('returns file for absolute paths', () => {
    expect(detectInputType('/abs/path.json')).toBe('file')
  })

  test('returns url for https', () => {
    expect(detectInputType('https://example.com/spec.json')).toBe('url')
  })

  test('returns url for http', () => {
    expect(detectInputType('http://localhost:8080/api-docs')).toBe('url')
  })
})

describe('detectSpecFormat', () => {
  test('returns json for JSON content', () => {
    expect(detectSpecFormat('{"openapi":"3.0.0"}')).toBe('json')
  })

  test('returns yaml for YAML content', () => {
    expect(detectSpecFormat('openapi: "3.0.0"')).toBe('yaml')
  })
})

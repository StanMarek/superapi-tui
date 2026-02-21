import { describe, expect, test } from 'bun:test'
import { parseYamlOrJson } from '@/utils/yaml.js'

describe('parseYamlOrJson', () => {
  test('parses valid JSON', () => {
    const result = parseYamlOrJson('{"openapi": "3.0.0"}')
    expect(result).toEqual({ openapi: '3.0.0' })
  })

  test('parses valid YAML', () => {
    const result = parseYamlOrJson('openapi: "3.0.0"\ninfo:\n  title: Test')
    expect(result).toEqual({ openapi: '3.0.0', info: { title: 'Test' } })
  })

  test('prefers JSON when content is valid JSON', () => {
    const result = parseYamlOrJson('{"key": "value"}')
    expect(result).toEqual({ key: 'value' })
  })

  test('throws on completely invalid content', () => {
    expect(() => parseYamlOrJson('not valid {{{')).toThrow()
  })
})

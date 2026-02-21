import { describe, expect, test } from 'bun:test'
import { join } from 'path'
import { loadFromFile } from '@/loader/file.js'
import { SpecLoadError } from '@/types/index.js'

const FIXTURES = join(import.meta.dir, '../fixtures')

describe('loadFromFile', () => {
  test('reads a JSON fixture', async () => {
    const result = await loadFromFile(join(FIXTURES, 'minimal-spec.json'))
    expect(result.inputType).toBe('file')
    expect(result.format).toBe('json')
    expect(result.content).toContain('openapi')
  })

  test('reads a YAML fixture', async () => {
    const result = await loadFromFile(join(FIXTURES, 'petstore-3.0.yaml'))
    expect(result.inputType).toBe('file')
    expect(result.format).toBe('yaml')
    expect(result.content).toContain('openapi')
  })

  test('throws SpecLoadError for nonexistent file', async () => {
    await expect(loadFromFile('/nonexistent/file.json')).rejects.toBeInstanceOf(SpecLoadError)
  })

  test('includes source path in result', async () => {
    const path = join(FIXTURES, 'minimal-spec.json')
    const result = await loadFromFile(path)
    expect(result.source).toBe(path)
  })
})

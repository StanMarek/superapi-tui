import { describe, expect, test } from 'bun:test'
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

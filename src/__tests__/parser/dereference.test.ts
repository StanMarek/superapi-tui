import { describe, expect, test } from 'bun:test'
import { readFileSync } from 'fs'
import { join } from 'path'
import { dereferenceSpec } from '@/parser/dereference.js'

const FIXTURES = join(import.meta.dir, '../fixtures')

describe('dereferenceSpec', () => {
  test('resolves $ref in v3.0 spec', () => {
    const content = readFileSync(join(FIXTURES, 'petstore-3.0.yaml'), 'utf8')
    const result = dereferenceSpec(content)
    expect(result).toBeDefined()
    expect(result.openapi).toBeDefined()
  })

  test('handles spec with no $ref references', () => {
    const content = readFileSync(join(FIXTURES, 'minimal-spec.json'), 'utf8')
    const result = dereferenceSpec(content)
    expect(result).toBeDefined()
  })
})

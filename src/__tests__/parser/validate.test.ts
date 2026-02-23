import { describe, expect, test } from 'bun:test'
import { readFileSync } from 'fs'
import { join } from 'path'
import { validateSpec } from '@/parser/validate.js'
import { SpecParseError } from '@/types/index.js'

const FIXTURES = join(import.meta.dir, '../fixtures')

describe('validateSpec', () => {
  test('returns no warnings for valid v3.0 spec', async () => {
    const content = readFileSync(join(FIXTURES, 'petstore-3.0.yaml'), 'utf8')
    const result = await validateSpec(content)
    expect(result.warnings).toHaveLength(0)
  })

  test('returns no warnings for valid v3.1 spec', async () => {
    const content = readFileSync(join(FIXTURES, 'petstore-3.1.json'), 'utf8')
    const result = await validateSpec(content)
    expect(result.warnings).toHaveLength(0)
  })

  test('returns warnings for invalid spec', async () => {
    const result = await validateSpec('{"not":"an openapi spec"}')
    expect(result.warnings.length).toBeGreaterThan(0)
  })

  test('throws SpecParseError for unparseable content', async () => {
    await expect(validateSpec('{{{')).rejects.toBeInstanceOf(SpecParseError)
  })
})

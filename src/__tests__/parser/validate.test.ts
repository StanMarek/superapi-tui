import { describe, expect, test } from 'bun:test'
import { readFileSync } from 'fs'
import { join } from 'path'
import { validateSpec } from '@/parser/validate.js'
import { SpecParseError } from '@/types/index.js'

const FIXTURES = join(import.meta.dir, '../fixtures')

describe('validateSpec', () => {
  test('succeeds for valid v3.0 spec', async () => {
    const content = readFileSync(join(FIXTURES, 'petstore-3.0.yaml'), 'utf8')
    await expect(validateSpec(content)).resolves.toBeUndefined()
  })

  test('succeeds for valid v3.1 spec', async () => {
    const content = readFileSync(join(FIXTURES, 'petstore-3.1.json'), 'utf8')
    await expect(validateSpec(content)).resolves.toBeUndefined()
  })

  test('throws SpecParseError for invalid spec', async () => {
    await expect(validateSpec('{"not":"an openapi spec"}')).rejects.toBeInstanceOf(SpecParseError)
  })
})

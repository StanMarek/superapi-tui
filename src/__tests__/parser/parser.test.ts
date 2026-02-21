import { describe, expect, test } from 'bun:test'
import { readFileSync } from 'fs'
import { join } from 'path'
import { parseSpec } from '@/parser/index.js'
import { SpecParseError } from '@/types/index.js'

const FIXTURES = join(import.meta.dir, '../fixtures')

describe('parseSpec (end-to-end)', () => {
  test('parses petstore v3.0 YAML', async () => {
    const content = readFileSync(join(FIXTURES, 'petstore-3.0.yaml'), 'utf8')
    const result = await parseSpec(content)

    expect(result.info.title).toBe('Petstore')
    expect(result.endpoints.length).toBeGreaterThan(0)
    expect(result.tagGroups.length).toBeGreaterThan(0)
    expect(result.securitySchemes.length).toBeGreaterThan(0)
  })

  test('parses petstore v3.1 JSON', async () => {
    const content = readFileSync(join(FIXTURES, 'petstore-3.1.json'), 'utf8')
    const result = await parseSpec(content)

    expect(result.info.title).toBe('Petstore')
    expect(result.info.specVersion).toBe('3.1.0')
    expect(result.endpoints.length).toBeGreaterThan(0)
  })

  test('parses minimal spec', async () => {
    const content = readFileSync(join(FIXTURES, 'minimal-spec.json'), 'utf8')
    const result = await parseSpec(content)

    expect(result.info.title).toBe('Minimal API')
    expect(result.endpoints).toHaveLength(0)
  })

  test('throws SpecParseError for invalid content', async () => {
    await expect(parseSpec('{"invalid": true}')).rejects.toBeInstanceOf(SpecParseError)
  })

  test('resolves $ref references in endpoints', async () => {
    const content = readFileSync(join(FIXTURES, 'petstore-3.0.yaml'), 'utf8')
    const result = await parseSpec(content)

    // The POST /pets endpoint should have a resolved request body schema
    const createPet = result.endpoints.find((e) => e.operationId === 'createPet')
    expect(createPet).toBeDefined()
    expect(createPet!.requestBody).toBeDefined()
    expect(createPet!.requestBody!.content.length).toBeGreaterThan(0)
    // Schema should be resolved (not a $ref)
    const schema = createPet!.requestBody!.content[0].schema
    expect(schema).toBeDefined()
    expect(schema!.type).toBe('object')
  })
})

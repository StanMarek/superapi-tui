import { describe, expect, test } from 'bun:test'
import { readFileSync } from 'fs'
import { join } from 'path'
import { transformSpec } from '@/parser/transform.js'
import { dereferenceSpec } from '@/parser/dereference.js'

const FIXTURES = join(import.meta.dir, '../fixtures')

function loadAndDeref(filename: string): Record<string, unknown> {
  const content = readFileSync(join(FIXTURES, filename), 'utf8')
  return dereferenceSpec(content)
}

describe('transformSpec', () => {
  test('transforms minimal spec', () => {
    const doc = loadAndDeref('minimal-spec.json')
    const result = transformSpec(doc)

    expect(result.info.title).toBe('Minimal API')
    expect(result.info.version).toBe('1.0.0')
    expect(result.info.specVersion).toBe('3.0.0')
    expect(result.endpoints).toHaveLength(0)
    expect(result.tagGroups).toHaveLength(0)
    expect(result.servers).toHaveLength(0)
  })

  test('transforms petstore v3.0 with correct tag groups', () => {
    const doc = loadAndDeref('petstore-3.0.yaml')
    const result = transformSpec(doc)

    expect(result.info.title).toBe('Petstore')
    expect(result.tagGroups).toHaveLength(2)

    const petGroup = result.tagGroups.find((g) => g.name === 'pets')
    expect(petGroup).toBeDefined()
    expect(petGroup!.endpoints.length).toBeGreaterThanOrEqual(3)

    const storeGroup = result.tagGroups.find((g) => g.name === 'store')
    expect(storeGroup).toBeDefined()
    expect(storeGroup!.endpoints).toHaveLength(1)
  })

  test('extracts correct endpoint count from petstore', () => {
    const doc = loadAndDeref('petstore-3.0.yaml')
    const result = transformSpec(doc)

    // 5 endpoints: GET /pets, POST /pets, GET /pets/{petId}, DELETE /pets/{petId}, GET /store/inventory
    expect(result.endpoints).toHaveLength(5)
  })

  test('extracts servers', () => {
    const doc = loadAndDeref('petstore-3.0.yaml')
    const result = transformSpec(doc)

    expect(result.servers).toHaveLength(2)
    expect(result.servers[0].url).toBe('https://api.petstore.io/v1')
    expect(result.servers[1].url).toBe('http://localhost:3000/v1')
  })

  test('extracts security schemes', () => {
    const doc = loadAndDeref('petstore-3.0.yaml')
    const result = transformSpec(doc)

    expect(result.securitySchemes).toHaveLength(2)
    const bearer = result.securitySchemes.find((s) => s.name === 'bearerAuth')
    expect(bearer).toBeDefined()
    expect(bearer!.type).toBe('http')
    expect(bearer!.scheme).toBe('bearer')

    const apiKey = result.securitySchemes.find((s) => s.name === 'apiKey')
    expect(apiKey).toBeDefined()
    expect(apiKey!.type).toBe('apiKey')
    expect(apiKey!.paramName).toBe('X-API-Key')
  })

  test('extracts global security', () => {
    const doc = loadAndDeref('petstore-3.0.yaml')
    const result = transformSpec(doc)

    expect(result.globalSecurity).toHaveLength(1)
    expect(result.globalSecurity[0].name).toBe('bearerAuth')
  })

  test('extracts component schemas', () => {
    const doc = loadAndDeref('petstore-3.0.yaml')
    const result = transformSpec(doc)

    expect(result.componentSchemas.size).toBe(2)
    expect(result.componentSchemas.has('Pet')).toBe(true)
    expect(result.componentSchemas.has('Error')).toBe(true)

    const pet = result.componentSchemas.get('Pet')!
    expect(pet.type).toBe('object')
    expect(pet.refName).toBe('Pet')
  })

  test('tag ordering matches spec-defined tags', () => {
    const doc = loadAndDeref('petstore-3.0.yaml')
    const result = transformSpec(doc)

    expect(result.tags[0]).toBe('pets')
    expect(result.tags[1]).toBe('store')
    expect(result.tagGroups[0].name).toBe('pets')
    expect(result.tagGroups[1].name).toBe('store')
  })

  test('endpoints without tags go to default group', () => {
    const doc: Record<string, unknown> = {
      openapi: '3.0.0',
      info: { title: 'Test', version: '1.0' },
      paths: {
        '/health': {
          get: {
            responses: { '200': { description: 'OK' } },
          },
        },
      },
    }
    const result = transformSpec(doc)

    expect(result.tagGroups).toHaveLength(1)
    expect(result.tagGroups[0].name).toBe('default')
    expect(result.tagGroups[0].endpoints).toHaveLength(1)
  })

  test('extracts tag descriptions', () => {
    const doc = loadAndDeref('petstore-3.0.yaml')
    const result = transformSpec(doc)

    const petGroup = result.tagGroups.find((g) => g.name === 'pets')
    expect(petGroup!.description).toBe('Pet operations')
  })

  test('handles v3.1 server variables', () => {
    const doc = loadAndDeref('petstore-3.1.json')
    const result = transformSpec(doc)

    const localServer = result.servers.find((s) => s.url.includes('localhost'))
    expect(localServer).toBeDefined()
    expect(localServer!.variables.size).toBeGreaterThan(0)
    const portVar = localServer!.variables.get('port')
    expect(portVar).toBeDefined()
    expect(portVar!.defaultValue).toBe('3000')
  })
})

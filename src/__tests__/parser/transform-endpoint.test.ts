import { describe, expect, test } from 'bun:test'
import { transformEndpoint } from '@/parser/transform-endpoint.js'

describe('transformEndpoint', () => {
  test('transforms a GET endpoint with query params', () => {
    const result = transformEndpoint('/pets', 'get', {
      summary: 'List all pets',
      operationId: 'listPets',
      tags: ['pets'],
      parameters: [
        {
          name: 'limit',
          in: 'query',
          required: false,
          schema: { type: 'integer', minimum: 1, maximum: 100 },
        },
      ],
      responses: {
        '200': {
          description: 'A list of pets',
          content: {
            'application/json': {
              schema: { type: 'array', items: { type: 'string' } },
            },
          },
        },
      },
    })

    expect(result.id).toBe('get:/pets')
    expect(result.method).toBe('get')
    expect(result.path).toBe('/pets')
    expect(result.summary).toBe('List all pets')
    expect(result.operationId).toBe('listPets')
    expect(result.tags).toEqual(['pets'])
    expect(result.parameters).toHaveLength(1)
    expect(result.parameters[0].name).toBe('limit')
    expect(result.parameters[0].location).toBe('query')
    expect(result.responses).toHaveLength(1)
    expect(result.responses[0].statusCode).toBe('200')
  })

  test('transforms a POST endpoint with request body', () => {
    const result = transformEndpoint('/pets', 'post', {
      tags: ['pets'],
      summary: 'Create a pet',
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: { type: 'object', properties: { name: { type: 'string' } } },
          },
        },
      },
      responses: {
        '201': { description: 'Created' },
      },
    })

    expect(result.method).toBe('post')
    expect(result.requestBody).toBeDefined()
    expect(result.requestBody?.required).toBe(true)
    expect(result.requestBody?.content).toHaveLength(1)
    expect(result.requestBody?.content[0].mediaType).toBe('application/json')
  })

  test('merges path-level and operation-level parameters', () => {
    const pathParams = [
      { name: 'petId', in: 'path', required: true, schema: { type: 'string' } },
    ]
    const result = transformEndpoint(
      '/pets/{petId}',
      'get',
      {
        parameters: [
          { name: 'include', in: 'query', schema: { type: 'string' } },
        ],
        responses: { '200': { description: 'OK' } },
      },
      pathParams,
    )

    expect(result.parameters).toHaveLength(2)
    const names = result.parameters.map((p) => p.name)
    expect(names).toContain('petId')
    expect(names).toContain('include')
  })

  test('operation params override same-name path params', () => {
    const pathParams = [
      { name: 'petId', in: 'path', required: true, schema: { type: 'string' }, description: 'from path' },
    ]
    const result = transformEndpoint(
      '/pets/{petId}',
      'get',
      {
        parameters: [
          { name: 'petId', in: 'path', required: true, schema: { type: 'integer' }, description: 'from op' },
        ],
        responses: { '200': { description: 'OK' } },
      },
      pathParams,
    )

    expect(result.parameters).toHaveLength(1)
    expect(result.parameters[0].schema?.type).toBe('integer')
  })

  test('handles deprecated flag', () => {
    const result = transformEndpoint('/old', 'get', {
      deprecated: true,
      responses: { '200': { description: 'OK' } },
    })
    expect(result.deprecated).toBe(true)
  })

  test('handles multiple responses', () => {
    const result = transformEndpoint('/pets', 'get', {
      responses: {
        '200': { description: 'Success' },
        '400': { description: 'Bad request' },
        '404': { description: 'Not found' },
      },
    })
    expect(result.responses).toHaveLength(3)
    expect(result.responses.map((r) => r.statusCode)).toEqual(['200', '400', '404'])
  })

  test('handles security requirements', () => {
    const result = transformEndpoint('/secure', 'post', {
      security: [{ bearerAuth: [] }, { apiKey: ['read'] }],
      responses: { '200': { description: 'OK' } },
    })
    expect(result.security).toHaveLength(2)
    expect(result.security![0].name).toBe('bearerAuth')
    expect(result.security![1].scopes).toEqual(['read'])
  })

  test('defaults tags to empty array', () => {
    const result = transformEndpoint('/test', 'get', {
      responses: { '200': { description: 'OK' } },
    })
    expect(result.tags).toEqual([])
  })

  test('handles response headers', () => {
    const result = transformEndpoint('/pets', 'get', {
      responses: {
        '200': {
          description: 'OK',
          headers: {
            'X-Total-Count': {
              description: 'Total items',
              schema: { type: 'integer' },
            },
          },
        },
      },
    })
    expect(result.responses[0].headers).toHaveLength(1)
    expect(result.responses[0].headers[0].name).toBe('X-Total-Count')
  })
})

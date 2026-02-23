import { describe, test, expect, mock, afterEach } from 'bun:test'
import { render } from 'ink-testing-library'
import App from '../../App.js'
import type { ParsedSpec, SchemaInfo } from '@/types/index.js'

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

function makeSchema(overrides: Partial<SchemaInfo> = {}): SchemaInfo {
  return {
    type: 'object',
    nullable: false,
    readOnly: false,
    writeOnly: false,
    displayType: 'object',
    ...overrides,
  }
}

const testSpec: ParsedSpec = {
  info: {
    title: 'Test API',
    version: '1.0.0',
    specVersion: '3.0.0',
  },
  servers: [
    { url: 'https://api.example.com', variables: new Map() },
  ],
  tagGroups: [
    {
      name: 'pets',
      endpoints: [
        {
          id: 'get-/pets',
          method: 'get',
          path: '/pets',
          summary: 'List pets',
          tags: ['pets'],
          deprecated: false,
          parameters: [
            { name: 'limit', location: 'query', required: false, deprecated: false },
          ],
          responses: [],
        },
        {
          id: 'post-/pets',
          method: 'post',
          path: '/pets',
          summary: 'Create pet',
          tags: ['pets'],
          deprecated: false,
          parameters: [],
          requestBody: {
            required: true,
            content: [{
              mediaType: 'application/json',
              schema: makeSchema({
                properties: new Map<string, SchemaInfo>([
                  ['name', makeSchema({ type: 'string', displayType: 'string' })],
                ]),
              }),
            }],
          },
          responses: [],
        },
      ],
    },
  ],
  endpoints: [
    {
      id: 'get-/pets',
      method: 'get',
      path: '/pets',
      summary: 'List pets',
      tags: ['pets'],
      deprecated: false,
      parameters: [
        { name: 'limit', location: 'query', required: false, deprecated: false },
      ],
      responses: [],
    },
    {
      id: 'post-/pets',
      method: 'post',
      path: '/pets',
      summary: 'Create pet',
      tags: ['pets'],
      deprecated: false,
      parameters: [],
      requestBody: {
        required: true,
        content: [{
          mediaType: 'application/json',
          schema: makeSchema({
            properties: new Map<string, SchemaInfo>([
              ['name', makeSchema({ type: 'string', displayType: 'string' })],
            ]),
          }),
        }],
      },
      responses: [],
    },
  ],
  tags: ['pets'],
  securitySchemes: [],
  globalSecurity: [],
  componentSchemas: new Map(),
}

afterEach(() => {
  mock.restore()
})

describe('RequestPanel integration', () => {
  test('full flow: select endpoint → tab to request → send → view response', async () => {
    globalThis.fetch = mock(() =>
      Promise.resolve(new Response('{"pets": []}', {
        status: 200,
        statusText: 'OK',
        headers: { 'Content-Type': 'application/json' },
      })),
    ) as unknown as typeof fetch

    const { lastFrame, stdin } = render(<App spec={testSpec} />)
    await delay(100)

    // Initial state: endpoints panel focused
    expect(lastFrame()).toContain('Request / Response')

    // Expand tag group (collapsed by default), navigate to first endpoint, select it
    stdin.write('\r')
    await delay(50)
    stdin.write('j')
    await delay(50)
    stdin.write('\r')
    await delay(50)

    // Tab twice to get to request panel
    stdin.write('\t')
    await delay(50)
    stdin.write('\t')
    await delay(50)

    // Should now show the server and send button
    expect(lastFrame()).toContain('https://api.example.com')
    expect(lastFrame()).toContain('Send Request')

    // Send request
    stdin.write('s')
    await delay(500)

    // Should show response
    expect(lastFrame()).toContain('200')
    expect(lastFrame()).toContain('"pets"')
  })

  test('response tab switching works in full app', async () => {
    globalThis.fetch = mock(() =>
      Promise.resolve(new Response('{"result": true}', {
        status: 200,
        statusText: 'OK',
        headers: { 'X-Request-Id': 'abc-123' },
      })),
    ) as unknown as typeof fetch

    const { lastFrame, stdin } = render(<App spec={testSpec} />)
    await delay(100)

    // Expand tag group (collapsed by default), select first endpoint
    stdin.write('\r')
    await delay(50)
    stdin.write('j')
    await delay(50)
    stdin.write('\r')
    await delay(50)

    // Tab to request panel
    stdin.write('\t')
    await delay(50)
    stdin.write('\t')
    await delay(50)

    // Send
    stdin.write('s')
    await delay(500)

    // Pretty tab shows JSON
    expect(lastFrame()).toContain('"result"')

    // Switch to headers tab
    stdin.write('3')
    await delay(50)

    expect(lastFrame()).toContain('x-request-id')
    expect(lastFrame()).toContain('abc-123')

    // Switch to raw tab
    stdin.write('2')
    await delay(50)

    expect(lastFrame()).toContain('{"result": true}')
  })

  test('request panel shows "No servers defined" for spec with no servers', async () => {
    const noServerSpec: ParsedSpec = { ...testSpec, servers: [] }
    const { lastFrame, stdin } = render(<App spec={noServerSpec} />)
    await delay(100)

    // Expand tag group (collapsed by default), select first endpoint
    stdin.write('\r')
    await delay(50)
    stdin.write('j')
    await delay(50)
    stdin.write('\r')
    await delay(50)

    // Tab to request
    stdin.write('\t')
    await delay(50)
    stdin.write('\t')
    await delay(50)

    expect(lastFrame()).toContain('No servers defined')
  })

  test('SSRF protection shows error for http non-localhost', async () => {
    const httpSpec: ParsedSpec = {
      ...testSpec,
      servers: [{ url: 'http://evil.example.com', variables: new Map() }],
    }

    const { lastFrame, stdin } = render(<App spec={httpSpec} />)
    await delay(100)

    // Expand tag group (collapsed by default), select first endpoint
    stdin.write('\r')
    await delay(50)
    stdin.write('j')
    await delay(50)
    stdin.write('\r')
    await delay(50)

    // Tab to request
    stdin.write('\t')
    await delay(50)
    stdin.write('\t')
    await delay(50)

    // Send
    stdin.write('s')
    await delay(300)

    expect(lastFrame()).toContain('Error')
    expect(lastFrame()).toContain('localhost')
  })

  test('POST endpoint shows body editor with template', async () => {
    const { lastFrame, stdin } = render(<App spec={testSpec} />)
    await delay(100)

    // Expand tag group (collapsed by default), navigate to POST /pets (second endpoint)
    stdin.write('\r')
    await delay(50)
    stdin.write('j')
    await delay(50)
    stdin.write('j')
    await delay(50)
    stdin.write('\r')
    await delay(50)

    // Tab to request panel
    stdin.write('\t')
    await delay(50)
    stdin.write('\t')
    await delay(100)

    expect(lastFrame()).toContain('Body')
    expect(lastFrame()).toContain('"name"')
  })
})

describe('Auth integration', () => {
  test('bearer auth: configure token → send → verify Authorization header', async () => {
    const fetchMock = mock(() =>
      Promise.resolve(new Response('{"ok":true}', {
        status: 200,
        statusText: 'OK',
      })),
    )
    globalThis.fetch = fetchMock as unknown as typeof fetch

    const bearerSpec: ParsedSpec = {
      ...testSpec,
      securitySchemes: [
        { name: 'bearerAuth', type: 'http', scheme: 'bearer' },
      ],
    }

    const { lastFrame, stdin } = render(<App spec={bearerSpec} />)
    await delay(100)

    // Expand tag group (collapsed by default), select first endpoint
    stdin.write('\r')
    await delay(50)
    stdin.write('j')
    await delay(50)
    stdin.write('\r')
    await delay(50)

    // Tab to request panel
    stdin.write('\t')
    await delay(50)
    stdin.write('\t')
    await delay(50)

    // Open auth section
    stdin.write('a')
    await delay(50)

    // Navigate to token field: server(0) → auth-toggle(1) → auth-type(2) → token(3)
    stdin.write('j')
    await delay(50)
    stdin.write('j')
    await delay(50)
    stdin.write('j')
    await delay(50)

    // Enter edit mode, type token, confirm
    stdin.write('\r')
    await delay(50)
    stdin.write('t')
    await delay(30)
    stdin.write('e')
    await delay(30)
    stdin.write('s')
    await delay(30)
    stdin.write('t')
    await delay(30)
    stdin.write('\r')
    await delay(50)

    // Send request
    stdin.write('s')
    await delay(500)

    expect(lastFrame()).toContain('200')

    // Verify Authorization header was sent
    const calls = fetchMock.mock.calls as unknown as [string, RequestInit][]
    expect(calls.length).toBeGreaterThan(0)
    const headers = calls[calls.length - 1][1].headers as Record<string, string>
    expect(headers['Authorization']).toBe('Bearer test')
  })

  test('apiKey query: configure key → send → verify query param in URL', async () => {
    const fetchMock = mock(() =>
      Promise.resolve(new Response('{"ok":true}', {
        status: 200,
        statusText: 'OK',
      })),
    )
    globalThis.fetch = fetchMock as unknown as typeof fetch

    const apiKeySpec: ParsedSpec = {
      ...testSpec,
      securitySchemes: [
        { name: 'queryKey', type: 'apiKey', in: 'query', paramName: 'api_key' },
      ],
    }

    const { lastFrame, stdin } = render(<App spec={apiKeySpec} />)
    await delay(100)

    // Expand tag group (collapsed by default), select first endpoint
    stdin.write('\r')
    await delay(50)
    stdin.write('j')
    await delay(50)
    stdin.write('\r')
    await delay(50)

    // Tab to request panel
    stdin.write('\t')
    await delay(50)
    stdin.write('\t')
    await delay(50)

    // Open auth section
    stdin.write('a')
    await delay(50)

    // Navigate to key field: server(0) → auth-toggle(1) → auth-type(2) → key(3)
    stdin.write('j')
    await delay(50)
    stdin.write('j')
    await delay(50)
    stdin.write('j')
    await delay(50)

    // Enter edit mode, type key, confirm
    stdin.write('\r')
    await delay(50)
    stdin.write('k')
    await delay(30)
    stdin.write('1')
    await delay(30)
    stdin.write('2')
    await delay(30)
    stdin.write('3')
    await delay(30)
    stdin.write('\r')
    await delay(50)

    // Send
    stdin.write('s')
    await delay(500)

    expect(lastFrame()).toContain('200')

    // Verify query param in URL
    const calls = fetchMock.mock.calls as unknown as [string, RequestInit][]
    const url = calls[calls.length - 1][0]
    expect(url).toContain('api_key=k123')
  })

  test('auth persists across endpoint changes', async () => {
    const fetchMock = mock(() =>
      Promise.resolve(new Response('{"ok":true}', {
        status: 200,
        statusText: 'OK',
      })),
    )
    globalThis.fetch = fetchMock as unknown as typeof fetch

    const bearerSpec: ParsedSpec = {
      ...testSpec,
      securitySchemes: [
        { name: 'bearerAuth', type: 'http', scheme: 'bearer' },
      ],
    }

    const { lastFrame, stdin } = render(<App spec={bearerSpec} />)
    await delay(100)

    // Expand tag group (collapsed by default), select first endpoint
    stdin.write('\r')
    await delay(50)
    stdin.write('j')
    await delay(50)
    stdin.write('\r')
    await delay(50)

    // Tab to request panel
    stdin.write('\t')
    await delay(50)
    stdin.write('\t')
    await delay(50)

    // Open auth, configure token
    stdin.write('a')
    await delay(50)
    stdin.write('j')
    await delay(50)
    stdin.write('j')
    await delay(50)
    stdin.write('j')
    await delay(50)
    stdin.write('\r')
    await delay(50)
    stdin.write('p')
    await delay(30)
    stdin.write('e')
    await delay(30)
    stdin.write('r')
    await delay(30)
    stdin.write('s')
    await delay(30)
    stdin.write('i')
    await delay(30)
    stdin.write('s')
    await delay(30)
    stdin.write('t')
    await delay(30)
    stdin.write('\r')
    await delay(50)

    // Auth toggle should show token was set
    expect(lastFrame()).toContain('persist')

    // Tab back to endpoint list
    stdin.write('\t')
    await delay(50)

    // Select second endpoint (navigate down)
    stdin.write('j')
    await delay(50)
    stdin.write('\r')
    await delay(50)

    // Tab back to request panel
    stdin.write('\t')
    await delay(50)
    stdin.write('\t')
    await delay(50)

    // Auth should still show the token
    expect(lastFrame()).toContain('persist')

    // Send and verify the auth header is included
    stdin.write('s')
    await delay(500)

    const calls = fetchMock.mock.calls as unknown as [string, RequestInit][]
    expect(calls.length).toBeGreaterThan(0)
    const headers = calls[calls.length - 1][1].headers as Record<string, string>
    expect(headers['Authorization']).toBe('Bearer persist')
  })
})

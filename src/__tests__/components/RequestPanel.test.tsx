import { describe, test, expect, mock, afterEach } from 'bun:test'
import { render } from 'ink-testing-library'
import { RequestPanel } from '@/components/RequestPanel.js'
import type { Endpoint, ServerInfo, SchemaInfo } from '@/types/index.js'

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

function makeEndpoint(overrides: Partial<Endpoint> = {}): Endpoint {
  return {
    id: 'get-pets',
    method: 'get',
    path: '/pets',
    tags: ['pets'],
    deprecated: false,
    parameters: [],
    responses: [],
    ...overrides,
  }
}

const defaultServers: ServerInfo[] = [
  { url: 'https://api.example.com', variables: new Map() },
]

afterEach(() => {
  mock.restore()
})

describe('RequestPanel - rendering', () => {
  test('shows "No endpoint selected" when endpoint is null', () => {
    const { lastFrame } = render(
      <RequestPanel endpoint={null} isFocused={false} servers={defaultServers} />,
    )
    expect(lastFrame()).toContain('No endpoint selected')
  })

  test('shows method and path when endpoint is provided', () => {
    const { lastFrame } = render(
      <RequestPanel endpoint={makeEndpoint()} isFocused={true} servers={defaultServers} />,
    )
    expect(lastFrame()).toContain('GET')
    expect(lastFrame()).toContain('/pets')
  })

  test('shows server URL', () => {
    const { lastFrame } = render(
      <RequestPanel endpoint={makeEndpoint()} isFocused={true} servers={defaultServers} />,
    )
    expect(lastFrame()).toContain('https://api.example.com')
  })

  test('shows "No servers defined" when servers array is empty', () => {
    const { lastFrame } = render(
      <RequestPanel endpoint={makeEndpoint()} isFocused={true} servers={[]} />,
    )
    expect(lastFrame()).toContain('No servers defined')
  })

  test('shows Send Request button', () => {
    const { lastFrame } = render(
      <RequestPanel endpoint={makeEndpoint()} isFocused={true} servers={defaultServers} />,
    )
    expect(lastFrame()).toContain('Send Request')
  })

  test('shows response tabs', () => {
    const { lastFrame } = render(
      <RequestPanel endpoint={makeEndpoint()} isFocused={true} servers={defaultServers} />,
    )
    expect(lastFrame()).toContain('[1] Pretty')
    expect(lastFrame()).toContain('[2] Raw')
    expect(lastFrame()).toContain('[3] Headers')
  })

  test('shows "No response yet" initially', () => {
    const { lastFrame } = render(
      <RequestPanel endpoint={makeEndpoint()} isFocused={true} servers={defaultServers} />,
    )
    expect(lastFrame()).toContain('No response yet')
  })

  test('shows parameters when endpoint has params', () => {
    const endpoint = makeEndpoint({
      parameters: [
        { name: 'petId', location: 'path', required: true, deprecated: false },
        { name: 'limit', location: 'query', required: false, deprecated: false },
      ],
    })
    const { lastFrame } = render(
      <RequestPanel endpoint={endpoint} isFocused={true} servers={defaultServers} />,
    )
    expect(lastFrame()).toContain('path:petId')
    expect(lastFrame()).toContain('query:limit')
  })

  test('shows body editor for POST endpoints with JSON body', async () => {
    const endpoint = makeEndpoint({
      method: 'post',
      path: '/pets',
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
    })
    const { lastFrame } = render(
      <RequestPanel endpoint={endpoint} isFocused={true} servers={defaultServers} />,
    )
    await delay(50)
    expect(lastFrame()).toContain('Body')
    expect(lastFrame()).toContain('e to edit')
  })
})

describe('RequestPanel - navigation', () => {
  test('j/k navigates rows', async () => {
    const endpoint = makeEndpoint({
      parameters: [
        { name: 'petId', location: 'path', required: true, deprecated: false },
      ],
    })
    const { lastFrame, stdin } = render(
      <RequestPanel endpoint={endpoint} isFocused={true} servers={defaultServers} />,
    )
    await delay(50)
    // Start at server row (index 0)
    expect(lastFrame()).toContain('Server')

    // Navigate down to param
    stdin.write('j')
    await delay(50)
    // Navigate down to send
    stdin.write('j')
    await delay(50)
    // Navigate back up
    stdin.write('k')
    await delay(50)
    // Should be on param row
    expect(lastFrame()).toContain('path:petId')
  })
})

describe('RequestPanel - param editing', () => {
  test('Enter starts param editing, typing appends, Enter confirms', async () => {
    const endpoint = makeEndpoint({
      parameters: [
        { name: 'petId', location: 'path', required: true, deprecated: false },
      ],
    })
    const { lastFrame, stdin } = render(
      <RequestPanel endpoint={endpoint} isFocused={true} servers={defaultServers} />,
    )
    await delay(50)

    // Navigate to param row
    stdin.write('j')
    await delay(50)

    // Enter edit mode
    stdin.write('\r')
    await delay(50)

    // Type a value
    stdin.write('1')
    await delay(50)
    stdin.write('2')
    await delay(50)
    stdin.write('3')
    await delay(50)

    // Should show edit buffer with cursor
    expect(lastFrame()).toContain('123')

    // Confirm with Enter
    stdin.write('\r')
    await delay(50)

    // Should show confirmed value
    expect(lastFrame()).toContain('123')
  })

  test('Escape cancels param editing', async () => {
    const endpoint = makeEndpoint({
      parameters: [
        { name: 'petId', location: 'path', required: true, deprecated: false },
      ],
    })
    const { lastFrame, stdin } = render(
      <RequestPanel endpoint={endpoint} isFocused={true} servers={defaultServers} />,
    )
    await delay(50)

    // Navigate to param row
    stdin.write('j')
    await delay(50)

    // Enter edit mode
    stdin.write('\r')
    await delay(50)

    // Type a value
    stdin.write('a')
    await delay(50)
    stdin.write('b')
    await delay(50)
    stdin.write('c')
    await delay(50)

    // Cancel with Escape
    stdin.write('\x1b')
    await delay(50)

    // Should NOT show the typed value (escaped without saving)
    expect(lastFrame()).toContain('<empty>')
  })
})

describe('RequestPanel - sending request', () => {
  test('s sends request and shows response', async () => {
    globalThis.fetch = mock(() =>
      Promise.resolve(new Response('{"message": "ok"}', {
        status: 200,
        statusText: 'OK',
        headers: { 'Content-Type': 'application/json' },
      })),
    ) as unknown as typeof fetch

    const { lastFrame, stdin } = render(
      <RequestPanel endpoint={makeEndpoint()} isFocused={true} servers={defaultServers} />,
    )
    await delay(50)

    // Send request
    stdin.write('s')
    await delay(300)

    expect(lastFrame()).toContain('200')
    expect(lastFrame()).toContain('"message"')
  })

  test('shows error on request failure', async () => {
    globalThis.fetch = mock(() =>
      Promise.reject(new Error('Connection refused')),
    ) as unknown as typeof fetch

    const { lastFrame, stdin } = render(
      <RequestPanel endpoint={makeEndpoint()} isFocused={true} servers={defaultServers} />,
    )
    await delay(50)

    stdin.write('s')
    await delay(300)

    expect(lastFrame()).toContain('Error')
  })

  test('2 switches to raw tab', async () => {
    globalThis.fetch = mock(() =>
      Promise.resolve(new Response('raw body text', {
        status: 200,
        statusText: 'OK',
      })),
    ) as unknown as typeof fetch

    const { lastFrame, stdin } = render(
      <RequestPanel endpoint={makeEndpoint()} isFocused={true} servers={defaultServers} />,
    )
    await delay(50)

    // Send request first
    stdin.write('s')
    await delay(300)

    // Switch to raw tab
    stdin.write('2')
    await delay(50)

    expect(lastFrame()).toContain('raw body text')
  })

  test('3 switches to headers tab', async () => {
    globalThis.fetch = mock(() =>
      Promise.resolve(new Response('', {
        status: 200,
        statusText: 'OK',
        headers: { 'X-Custom': 'test-value' },
      })),
    ) as unknown as typeof fetch

    const { lastFrame, stdin } = render(
      <RequestPanel endpoint={makeEndpoint()} isFocused={true} servers={defaultServers} />,
    )
    await delay(50)

    stdin.write('s')
    await delay(300)

    // Switch to headers tab
    stdin.write('3')
    await delay(50)

    expect(lastFrame()).toContain('x-custom')
    expect(lastFrame()).toContain('test-value')
  })
})

describe('RequestPanel - server cycling', () => {
  test('S cycles server URL', async () => {
    const servers: ServerInfo[] = [
      { url: 'https://api.example.com', variables: new Map() },
      { url: 'https://staging.example.com', variables: new Map() },
    ]

    const { lastFrame, stdin } = render(
      <RequestPanel endpoint={makeEndpoint()} isFocused={true} servers={servers} />,
    )
    await delay(50)

    expect(lastFrame()).toContain('https://api.example.com')

    stdin.write('S')
    await delay(50)

    expect(lastFrame()).toContain('https://staging.example.com')
  })
})

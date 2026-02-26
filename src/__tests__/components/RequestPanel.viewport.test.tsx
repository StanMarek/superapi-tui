import { describe, test, expect, mock, afterEach } from 'bun:test'
import { render } from 'ink-testing-library'
import { RequestPanel } from '@/components/RequestPanel.js'
import type { Endpoint, ServerInfo, SecuritySchemeInfo, ParameterInfo } from '@/types/index.js'

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

function makeParams(count: number): ParameterInfo[] {
  return Array.from({ length: count }, (_, i) => ({
    name: `param${i}`,
    location: 'query' as const,
    required: i === 0,
    deprecated: false,
    schema: { type: 'string' as const, displayType: 'string', nullable: false, readOnly: false, writeOnly: false },
  }))
}

const servers: readonly ServerInfo[] = [
  { url: 'https://api.example.com', description: 'Production', variables: new Map() },
]

const noSchemes: readonly SecuritySchemeInfo[] = []

afterEach(() => {
  mock.restore()
})

describe('RequestPanel viewport', () => {
  test('constrains rendered rows when many parameters', async () => {
    const endpoint: Endpoint = {
      id: 'get-/items',
      method: 'get',
      path: '/items',
      summary: 'Get items',
      tags: ['items'],
      deprecated: false,
      parameters: makeParams(15),
      responses: [],
    }

    const { lastFrame } = render(
      <RequestPanel
        endpoint={endpoint}
        isFocused={true}
        servers={servers}
        securitySchemes={noSchemes}
        terminalHeight={15}
      />,
    )
    await delay(50)
    const frame = lastFrame()!
    const lines = frame.split('\n')
    // Total lines should be constrained
    expect(lines.length).toBeLessThanOrEqual(15)
  })

  test('shows scroll indicators when rows overflow', async () => {
    const endpoint: Endpoint = {
      id: 'get-/items',
      method: 'get',
      path: '/items',
      summary: 'Get items',
      tags: ['items'],
      deprecated: false,
      parameters: makeParams(15),
      responses: [],
    }

    const { lastFrame, stdin } = render(
      <RequestPanel
        endpoint={endpoint}
        isFocused={true}
        servers={servers}
        securitySchemes={noSchemes}
        terminalHeight={15}
      />,
    )
    await delay(50)
    let frame = lastFrame()!
    // Should show overflow below (many params + send/response rows)
    expect(frame).toContain('more below')

    // Navigate down
    for (let i = 0; i < 12; i++) {
      stdin.write('j')
      await delay(20)
    }
    await delay(50)
    frame = lastFrame()!
    expect(frame).toContain('more above')
  })

  test('no viewport scrolling without terminalHeight', async () => {
    const endpoint: Endpoint = {
      id: 'get-/items',
      method: 'get',
      path: '/items',
      summary: 'Get items',
      tags: ['items'],
      deprecated: false,
      parameters: makeParams(5),
      responses: [],
    }

    const { lastFrame } = render(
      <RequestPanel
        endpoint={endpoint}
        isFocused={true}
        servers={servers}
        securitySchemes={noSchemes}
      />,
    )
    await delay(50)
    const frame = lastFrame()!
    // Without terminalHeight, all params should render
    const paramMatches = frame.match(/param\d+/g) ?? []
    expect(paramMatches.length).toBe(5)
    expect(frame).not.toContain('more below')
    expect(frame).not.toContain('more above')
  })

  test('dynamic response content cap with large response', async () => {
    const endpoint: Endpoint = {
      id: 'get-/items',
      method: 'get',
      path: '/items',
      summary: 'Get items',
      tags: ['items'],
      deprecated: false,
      parameters: [],
      responses: [],
    }

    // Mock fetch for a large JSON response
    const bigJson = JSON.stringify(
      Object.fromEntries(
        Array.from({ length: 50 }, (_, i) => [`key${i}`, `value${i}`]),
      ),
      null,
      2,
    )
    globalThis.fetch = mock(() =>
      Promise.resolve({
        ok: true,
        status: 200,
        statusText: 'OK',
        headers: new Headers({ 'content-type': 'application/json' }),
        text: () => Promise.resolve(bigJson),
      }),
    ) as unknown as typeof fetch

    const { lastFrame, stdin } = render(
      <RequestPanel
        endpoint={endpoint}
        isFocused={true}
        servers={servers}
        securitySchemes={noSchemes}
        terminalHeight={20}
      />,
    )
    await delay(50)
    // Send request
    stdin.write('s')
    await delay(200)
    // Navigate to response content
    stdin.write('G')
    await delay(50)
    const frame = lastFrame()!
    const lines = frame.split('\n')
    // Response should be capped to fit within terminal height
    expect(lines.length).toBeLessThanOrEqual(20)
  })
})

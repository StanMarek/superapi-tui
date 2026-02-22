import { describe, test, expect, mock, afterEach } from 'bun:test'
import { render } from 'ink-testing-library'
import { Box, Text } from 'ink'
import { useRequestState } from '@/hooks/useRequestState.js'
import type { Endpoint, ServerInfo, SchemaInfo } from '@/types/index.js'

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

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

interface HarnessProps {
  readonly endpoint: Endpoint | null
}

function Harness({ endpoint }: HarnessProps) {
  const state = useRequestState(endpoint)
  return (
    <Box flexDirection="column">
      <Text>serverIndex:{state.selectedServerIndex}</Text>
      <Text>bodyText:{state.bodyText}</Text>
      <Text>bodyError:{String(state.bodyError)}</Text>
      <Text>loading:{String(state.isLoading)}</Text>
      <Text>tab:{state.activeTab}</Text>
      <Text>error:{String(state.error)}</Text>
      <Text>status:{state.response?.status ?? 'none'}</Text>
      {/* Expose actions via data attributes simulated through text */}
      <Text>ACTIONS_READY</Text>
    </Box>
  )
}

// Harness that exposes actions through keyboard triggers
function ActionHarness({ endpoint }: HarnessProps) {
  const state = useRequestState(endpoint)

  // Expose state and actions via text output
  return (
    <Box flexDirection="column">
      <Text>serverIndex:{state.selectedServerIndex}</Text>
      <Text>bodyText:{state.bodyText}</Text>
      <Text>bodyError:{String(state.bodyError)}</Text>
      <Text>loading:{String(state.isLoading)}</Text>
      <Text>tab:{state.activeTab}</Text>
      <Text>error:{String(state.error)}</Text>
      <Text>status:{state.response?.status ?? 'none'}</Text>
      <Text>responseBody:{state.response?.body ?? 'none'}</Text>
      <Text>paramValues:{JSON.stringify([...state.paramValues.entries()])}</Text>
    </Box>
  )
}

afterEach(() => {
  mock.restore()
})

describe('useRequestState', () => {
  test('initializes with default state', () => {
    const { lastFrame } = render(<Harness endpoint={null} />)
    expect(lastFrame()).toContain('serverIndex:0')
    expect(lastFrame()).toContain('bodyText:{}')
    expect(lastFrame()).toContain('loading:false')
    expect(lastFrame()).toContain('tab:pretty')
    expect(lastFrame()).toContain('error:null')
    expect(lastFrame()).toContain('status:none')
  })

  test('generates body template from endpoint requestBody schema', async () => {
    const endpoint = makeEndpoint({
      method: 'post',
      path: '/pets',
      requestBody: {
        required: true,
        content: [
          {
            mediaType: 'application/json',
            schema: makeSchema({
              properties: new Map<string, SchemaInfo>([
                ['name', makeSchema({ type: 'string', displayType: 'string' })],
                ['age', makeSchema({ type: 'integer', displayType: 'integer' })],
              ]),
            }),
          },
        ],
      },
    })

    const { lastFrame } = render(<ActionHarness endpoint={endpoint} />)
    await delay(50)
    // Should contain the generated template
    expect(lastFrame()).toContain('"name"')
    expect(lastFrame()).toContain('"age"')
  })

  test('resets bodyText to {} when endpoint has no requestBody', async () => {
    const { lastFrame } = render(<ActionHarness endpoint={makeEndpoint()} />)
    await delay(50)
    expect(lastFrame()).toContain('bodyText:{}')
  })

  test('resets response and error when endpoint changes', async () => {
    const endpoint1 = makeEndpoint({ id: 'ep1' })
    const endpoint2 = makeEndpoint({ id: 'ep2' })

    const { lastFrame, rerender } = render(<ActionHarness endpoint={endpoint1} />)
    await delay(50)
    expect(lastFrame()).toContain('status:none')
    expect(lastFrame()).toContain('error:null')

    rerender(<ActionHarness endpoint={endpoint2} />)
    await delay(50)
    expect(lastFrame()).toContain('status:none')
    expect(lastFrame()).toContain('error:null')
  })

  test('resets active tab to pretty on endpoint change', async () => {
    const endpoint1 = makeEndpoint({ id: 'ep1' })
    const endpoint2 = makeEndpoint({ id: 'ep2' })

    const { lastFrame, rerender } = render(<ActionHarness endpoint={endpoint1} />)
    await delay(50)
    expect(lastFrame()).toContain('tab:pretty')

    rerender(<ActionHarness endpoint={endpoint2} />)
    await delay(50)
    expect(lastFrame()).toContain('tab:pretty')
  })
})

describe('useRequestState - cycleServer', () => {
  function CycleHarness({ endpoint }: { readonly endpoint: Endpoint | null }) {
    const state = useRequestState(endpoint)
    return (
      <Box flexDirection="column">
        <Text>serverIndex:{state.selectedServerIndex}</Text>
      </Box>
    )
  }

  test('starts at server index 0', () => {
    const { lastFrame } = render(<CycleHarness endpoint={null} />)
    expect(lastFrame()).toContain('serverIndex:0')
  })
})

import { useState, useEffect } from 'react'

describe('useRequestState - validateBody', () => {
  // Test with an endpoint that generates a valid JSON body template
  test('validateBody returns true for valid JSON body', async () => {
    const endpoint = makeEndpoint({
      method: 'post',
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

    function ValidHarness() {
      const state = useRequestState(endpoint)
      const [result, setResult] = useState<boolean | null>(null)
      useEffect(() => {
        // body is auto-generated valid JSON from template
        const timer = setTimeout(() => setResult(state.validateBody()), 30)
        return () => clearTimeout(timer)
      }, [])
      return (
        <Box flexDirection="column">
          <Text>valid:{String(result)}</Text>
          <Text>bodyError:{String(state.bodyError)}</Text>
        </Box>
      )
    }

    const { lastFrame } = render(<ValidHarness />)
    await delay(100)
    expect(lastFrame()).toContain('valid:true')
    expect(lastFrame()).toContain('bodyError:null')
  })

  test('validateBody returns false for invalid JSON body', async () => {
    function InvalidHarness() {
      const state = useRequestState(null)
      const [result, setResult] = useState<boolean | null>(null)
      const [phase, setPhase] = useState<'set' | 'validate' | 'done'>('set')

      useEffect(() => {
        if (phase === 'set') {
          state.setBodyText('{invalid json}')
          setPhase('validate')
        }
      }, [phase])

      useEffect(() => {
        if (phase === 'validate') {
          const timer = setTimeout(() => {
            setResult(state.validateBody())
            setPhase('done')
          }, 30)
          return () => clearTimeout(timer)
        }
      }, [phase])

      return (
        <Box flexDirection="column">
          <Text>valid:{String(result)}</Text>
          <Text>bodyError:{String(state.bodyError)}</Text>
        </Box>
      )
    }

    const { lastFrame } = render(<InvalidHarness />)
    await delay(200)
    expect(lastFrame()).toContain('valid:false')
    expect(lastFrame()).toContain('bodyError:Invalid JSON')
  })
})

describe('useRequestState - send', () => {
  function SendHarness({
    endpoint,
    servers,
  }: {
    readonly endpoint: Endpoint
    readonly servers: readonly ServerInfo[]
  }) {
    const state = useRequestState(endpoint)
    const [sent, setSent] = useState(false)

    if (!sent) {
      // Trigger send on first render
      setTimeout(() => {
        state.send(servers)
        setSent(true)
      }, 10)
    }

    return (
      <Box flexDirection="column">
        <Text>loading:{String(state.isLoading)}</Text>
        <Text>status:{state.response?.status ?? 'none'}</Text>
        <Text>error:{String(state.error)}</Text>
        <Text>responseBody:{state.response?.body ?? 'none'}</Text>
      </Box>
    )
  }

  test('sends request and shows response', async () => {
    globalThis.fetch = mock(() =>
      Promise.resolve(new Response('{"result": "ok"}', { status: 200 })),
    ) as unknown as typeof fetch

    const endpoint = makeEndpoint({ method: 'get', path: '/pets' })
    const servers: ServerInfo[] = [{ url: 'https://api.example.com', variables: new Map() }]

    const { lastFrame } = render(<SendHarness endpoint={endpoint} servers={servers} />)
    await delay(200)
    expect(lastFrame()).toContain('status:200')
    expect(lastFrame()).toContain('responseBody:{"result": "ok"}')
  })

  test('shows error on request failure', async () => {
    globalThis.fetch = mock(() =>
      Promise.reject(new Error('Connection refused')),
    ) as unknown as typeof fetch

    const endpoint = makeEndpoint({ method: 'get', path: '/pets' })
    const servers: ServerInfo[] = [{ url: 'https://api.example.com', variables: new Map() }]

    const { lastFrame } = render(<SendHarness endpoint={endpoint} servers={servers} />)
    await delay(200)
    expect(lastFrame()).toContain('error:Request failed')
  })

  test('does not send when no servers', async () => {
    const fetchMock = mock(() =>
      Promise.resolve(new Response('', { status: 200 })),
    )
    globalThis.fetch = fetchMock as unknown as typeof fetch

    const endpoint = makeEndpoint()
    const { lastFrame } = render(<SendHarness endpoint={endpoint} servers={[]} />)
    await delay(200)
    expect(lastFrame()).toContain('status:none')
  })

  test('does not send when no endpoint', () => {
    const fetchMock = mock(() =>
      Promise.resolve(new Response('', { status: 200 })),
    )
    globalThis.fetch = fetchMock as unknown as typeof fetch

    const { lastFrame } = render(<ActionHarness endpoint={null} />)
    expect(lastFrame()).toContain('status:none')
  })
})

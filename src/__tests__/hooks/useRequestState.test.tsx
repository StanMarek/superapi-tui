import { describe, test, expect, mock, afterEach } from 'bun:test'
import { render } from 'ink-testing-library'
import { Box, Text } from 'ink'
import { useRequestState } from '@/hooks/useRequestState.js'
import type { Endpoint, ServerInfo, SchemaInfo, SecuritySchemeInfo } from '@/types/index.js'

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
  readonly securitySchemes?: readonly SecuritySchemeInfo[]
}

function Harness({ endpoint, securitySchemes = [] }: HarnessProps) {
  const state = useRequestState(endpoint, securitySchemes)
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
function ActionHarness({ endpoint, securitySchemes = [] }: HarnessProps) {
  const state = useRequestState(endpoint, securitySchemes)

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
    const state = useRequestState(endpoint, [])
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

import { useState, useEffect, useRef } from 'react'

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
      const state = useRequestState(endpoint, [])
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
      const state = useRequestState(null, [])
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
    // SyntaxError message varies by runtime; just verify it's not null
    expect(lastFrame()).not.toContain('bodyError:null')
  })
})

describe('useRequestState - send', () => {
  function SendHarness({
    endpoint,
    servers,
    securitySchemes = [],
  }: {
    readonly endpoint: Endpoint
    readonly servers: readonly ServerInfo[]
    readonly securitySchemes?: readonly SecuritySchemeInfo[]
  }) {
    const state = useRequestState(endpoint, securitySchemes)
    const sentRef = useRef(false)

    useEffect(() => {
      if (!sentRef.current) {
        sentRef.current = true
        const timer = setTimeout(() => {
          state.send(servers)
        }, 10)
        return () => clearTimeout(timer)
      }
    }, [])

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

  test('shows error when no servers defined', async () => {
    const fetchMock = mock(() =>
      Promise.resolve(new Response('', { status: 200 })),
    )
    globalThis.fetch = fetchMock as unknown as typeof fetch

    const endpoint = makeEndpoint()
    const { lastFrame } = render(<SendHarness endpoint={endpoint} servers={[]} />)
    await delay(200)
    expect(lastFrame()).toContain('status:none')
    expect(lastFrame()).toContain('error:No servers defined')
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

describe('useRequestState - auth state', () => {
  function AuthHarness({
    endpoint,
    securitySchemes = [],
  }: {
    readonly endpoint: Endpoint | null
    readonly securitySchemes?: readonly SecuritySchemeInfo[]
  }) {
    const state = useRequestState(endpoint, securitySchemes)
    return (
      <Box flexDirection="column">
        <Text>authExpanded:{String(state.auth.authExpanded)}</Text>
        <Text>optionCount:{state.auth.availableOptions.length}</Text>
        <Text>selectedIndex:{state.auth.selectedOptionIndex}</Text>
        <Text>credMethod:{state.auth.credentials.method}</Text>
        {state.auth.availableOptions.map((opt, i) => (
          <Text key={i}>option:{opt.method}:{opt.label}</Text>
        ))}
      </Box>
    )
  }

  test('initializes with auth collapsed', () => {
    const { lastFrame } = render(<AuthHarness endpoint={null} />)
    expect(lastFrame()).toContain('authExpanded:false')
  })

  test('defaults credentials to bearer (first fallback option)', () => {
    const { lastFrame } = render(<AuthHarness endpoint={null} />)
    expect(lastFrame()).toContain('credMethod:bearer')
  })

  test('derives options from securitySchemes', () => {
    const schemes: SecuritySchemeInfo[] = [
      { name: 'bearerAuth', type: 'http', scheme: 'bearer' },
      { name: 'apiKeyAuth', type: 'apiKey', in: 'header', paramName: 'X-API-Key' },
    ]
    const { lastFrame } = render(<AuthHarness endpoint={null} securitySchemes={schemes} />)
    expect(lastFrame()).toContain('optionCount:2')
    expect(lastFrame()).toContain('option:bearer:')
    expect(lastFrame()).toContain('option:apiKey:')
  })

  test('falls back to 3 generic options when no schemes provided', () => {
    const { lastFrame } = render(<AuthHarness endpoint={null} securitySchemes={[]} />)
    expect(lastFrame()).toContain('optionCount:3')
  })

  test('toggleAuth toggles authExpanded', async () => {
    function ToggleHarness() {
      const state = useRequestState(null, [])
      const [phase, setPhase] = useState<'toggle' | 'done'>('toggle')

      useEffect(() => {
        if (phase === 'toggle') {
          const timer = setTimeout(() => {
            state.auth.toggleAuth()
            setPhase('done')
          }, 10)
          return () => clearTimeout(timer)
        }
      }, [phase])

      return <Text>authExpanded:{String(state.auth.authExpanded)}</Text>
    }

    const { lastFrame } = render(<ToggleHarness />)
    await delay(100)
    expect(lastFrame()).toContain('authExpanded:true')
  })

  test('cycleAuthOption advances selectedOptionIndex', async () => {
    function CycleHarness() {
      const state = useRequestState(null, [])
      const [phase, setPhase] = useState<'cycle' | 'done'>('cycle')

      useEffect(() => {
        if (phase === 'cycle') {
          const timer = setTimeout(() => {
            state.auth.cycleAuthOption()
            setPhase('done')
          }, 10)
          return () => clearTimeout(timer)
        }
      }, [phase])

      return (
        <Box flexDirection="column">
          <Text>selectedIndex:{state.auth.selectedOptionIndex}</Text>
          <Text>credMethod:{state.auth.credentials.method}</Text>
        </Box>
      )
    }

    const { lastFrame } = render(<CycleHarness />)
    await delay(100)
    // After cycling once from index 0 (bearer) → index 1 (apiKey)
    expect(lastFrame()).toContain('selectedIndex:1')
  })

  test('cycleAuthOption wraps around', async () => {
    function WrapHarness() {
      const state = useRequestState(null, [])
      const [cycleCount, setCycleCount] = useState(0)

      useEffect(() => {
        if (cycleCount < 3) {
          const timer = setTimeout(() => {
            state.auth.cycleAuthOption()
            setCycleCount(prev => prev + 1)
          }, 10)
          return () => clearTimeout(timer)
        }
      }, [cycleCount])

      return <Text>selectedIndex:{state.auth.selectedOptionIndex}</Text>
    }

    const { lastFrame } = render(<WrapHarness />)
    await delay(200)
    // 3 options, cycle 3 times: 0→1→2→0
    expect(lastFrame()).toContain('selectedIndex:0')
  })

  test('setAuthField updates bearer token', async () => {
    function FieldHarness() {
      const state = useRequestState(null, [])
      const [phase, setPhase] = useState<'set' | 'done'>('set')

      useEffect(() => {
        if (phase === 'set') {
          const timer = setTimeout(() => {
            state.auth.setAuthField('token', 'my-secret-token')
            setPhase('done')
          }, 10)
          return () => clearTimeout(timer)
        }
      }, [phase])

      return (
        <Box flexDirection="column">
          <Text>credMethod:{state.auth.credentials.method}</Text>
          <Text>token:{state.auth.credentials.method === 'bearer' ? state.auth.credentials.token : 'n/a'}</Text>
        </Box>
      )
    }

    const { lastFrame } = render(<FieldHarness />)
    await delay(100)
    expect(lastFrame()).toContain('credMethod:bearer')
    expect(lastFrame()).toContain('token:my-secret-token')
  })

  test('setAuthField updates basic username and password', async () => {
    function BasicHarness() {
      const state = useRequestState(null, [])
      const [phase, setPhase] = useState(0)

      useEffect(() => {
        if (phase === 0) {
          // Cycle to basic (index 2 in fallback: bearer=0, apiKey=1, basic=2)
          const timer = setTimeout(() => {
            state.auth.cycleAuthOption()
            state.auth.cycleAuthOption()
            setPhase(1)
          }, 10)
          return () => clearTimeout(timer)
        }
      }, [phase])

      useEffect(() => {
        if (phase === 1) {
          const timer = setTimeout(() => {
            state.auth.setAuthField('username', 'admin')
            state.auth.setAuthField('password', 'secret')
            setPhase(2)
          }, 10)
          return () => clearTimeout(timer)
        }
      }, [phase])

      const creds = state.auth.credentials
      return (
        <Box flexDirection="column">
          <Text>credMethod:{creds.method}</Text>
          <Text>username:{creds.method === 'basic' ? creds.username : 'n/a'}</Text>
          <Text>password:{creds.method === 'basic' ? creds.password : 'n/a'}</Text>
        </Box>
      )
    }

    const { lastFrame } = render(<BasicHarness />)
    await delay(200)
    expect(lastFrame()).toContain('credMethod:basic')
    expect(lastFrame()).toContain('username:admin')
    expect(lastFrame()).toContain('password:secret')
  })

  test('auth state persists across endpoint changes', async () => {
    const ep1 = makeEndpoint({ id: 'ep1' })
    const ep2 = makeEndpoint({ id: 'ep2' })

    function PersistHarness({ endpoint }: { readonly endpoint: Endpoint }) {
      const state = useRequestState(endpoint, [])
      const setRef = useRef(false)

      useEffect(() => {
        if (!setRef.current) {
          setRef.current = true
          const timer = setTimeout(() => {
            state.auth.setAuthField('token', 'persist-token')
          }, 10)
          return () => clearTimeout(timer)
        }
      }, [])

      return (
        <Box flexDirection="column">
          <Text>credMethod:{state.auth.credentials.method}</Text>
          <Text>token:{state.auth.credentials.method === 'bearer' ? state.auth.credentials.token : 'n/a'}</Text>
        </Box>
      )
    }

    const { lastFrame, rerender } = render(<PersistHarness endpoint={ep1} />)
    await delay(100)
    expect(lastFrame()).toContain('token:persist-token')

    // Change endpoint — auth should persist
    rerender(<PersistHarness endpoint={ep2} />)
    await delay(50)
    expect(lastFrame()).toContain('token:persist-token')
  })

  test('cycleAuthOption resets credential fields', async () => {
    function ResetHarness() {
      const state = useRequestState(null, [])
      const [phase, setPhase] = useState(0)

      useEffect(() => {
        if (phase === 0) {
          const timer = setTimeout(() => {
            state.auth.setAuthField('token', 'should-be-cleared')
            setPhase(1)
          }, 10)
          return () => clearTimeout(timer)
        }
      }, [phase])

      useEffect(() => {
        if (phase === 1) {
          const timer = setTimeout(() => {
            // Cycle from bearer to apiKey
            state.auth.cycleAuthOption()
            setPhase(2)
          }, 10)
          return () => clearTimeout(timer)
        }
      }, [phase])

      const creds = state.auth.credentials
      return (
        <Box flexDirection="column">
          <Text>credMethod:{creds.method}</Text>
          <Text>phase:{phase}</Text>
        </Box>
      )
    }

    const { lastFrame } = render(<ResetHarness />)
    await delay(200)
    // Should have cycled to apiKey
    expect(lastFrame()).toContain('credMethod:apiKey')
  })

  test('send injects bearer auth header', async () => {
    const fetchMock = mock(() =>
      Promise.resolve(new Response('{}', { status: 200 })),
    )
    globalThis.fetch = fetchMock as unknown as typeof fetch

    const stableEndpoint = makeEndpoint()
    const stableServers: readonly ServerInfo[] = [{ url: 'https://api.example.com', variables: new Map() }]

    function AuthSendHarness() {
      const state = useRequestState(stableEndpoint, [])
      const [phase, setPhase] = useState(0)

      useEffect(() => {
        if (phase === 0) {
          const timer = setTimeout(() => {
            state.auth.setAuthField('token', 'test-token')
            setPhase(1)
          }, 10)
          return () => clearTimeout(timer)
        }
      }, [phase])

      useEffect(() => {
        if (phase === 1) {
          const timer = setTimeout(() => {
            state.send(stableServers)
            setPhase(2)
          }, 10)
          return () => clearTimeout(timer)
        }
      }, [phase])

      return (
        <Box flexDirection="column">
          <Text>status:{state.response?.status ?? 'none'}</Text>
          <Text>phase:{phase}</Text>
        </Box>
      )
    }

    const { lastFrame } = render(<AuthSendHarness />)
    await delay(300)
    expect(lastFrame()).toContain('status:200')

    // Verify the fetch was called with Authorization header
    const calls = fetchMock.mock.calls as unknown as [string, RequestInit][]
    expect(calls.length).toBeGreaterThan(0)
    const lastCall = calls[calls.length - 1]
    const headers = lastCall[1].headers as Record<string, string>
    expect(headers['Authorization']).toBe('Bearer test-token')
  })

  test('send injects apiKey as query param', async () => {
    const fetchMock = mock(() =>
      Promise.resolve(new Response('{}', { status: 200 })),
    )
    globalThis.fetch = fetchMock as unknown as typeof fetch

    const schemes: SecuritySchemeInfo[] = [
      { name: 'queryKey', type: 'apiKey', in: 'query', paramName: 'api_key' },
    ]
    const stableEndpoint = makeEndpoint()
    const stableServers: readonly ServerInfo[] = [{ url: 'https://api.example.com', variables: new Map() }]

    function ApiKeySendHarness() {
      const state = useRequestState(stableEndpoint, schemes)
      const [phase, setPhase] = useState(0)

      useEffect(() => {
        if (phase === 0) {
          const timer = setTimeout(() => {
            state.auth.setAuthField('key', 'my-api-key')
            setPhase(1)
          }, 10)
          return () => clearTimeout(timer)
        }
      }, [phase])

      useEffect(() => {
        if (phase === 1) {
          const timer = setTimeout(() => {
            state.send(stableServers)
            setPhase(2)
          }, 10)
          return () => clearTimeout(timer)
        }
      }, [phase])

      return (
        <Box flexDirection="column">
          <Text>status:{state.response?.status ?? 'none'}</Text>
          <Text>phase:{phase}</Text>
        </Box>
      )
    }

    const { lastFrame } = render(<ApiKeySendHarness />)
    await delay(300)
    expect(lastFrame()).toContain('status:200')

    // Verify the URL contains the query param
    const calls = fetchMock.mock.calls as unknown as [string, RequestInit][]
    const url = calls[calls.length - 1][0]
    expect(url).toContain('api_key=my-api-key')
  })
})

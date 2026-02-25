import { describe, test, expect, mock, afterEach } from 'bun:test'
import { render } from 'ink-testing-library'
import { RequestPanel } from '@/components/RequestPanel.js'
import type { Endpoint, ServerInfo, SchemaInfo, SecuritySchemeInfo } from '@/types/index.js'
import type { SavedAuth } from '@/config/index.js'

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
      <RequestPanel endpoint={null} isFocused={false} servers={defaultServers} securitySchemes={[]} />,
    )
    expect(lastFrame()).toContain('No endpoint selected')
  })

  test('shows method and path when endpoint is provided', () => {
    const { lastFrame } = render(
      <RequestPanel endpoint={makeEndpoint()} isFocused={true} servers={defaultServers} securitySchemes={[]} />,
    )
    expect(lastFrame()).toContain('GET')
    expect(lastFrame()).toContain('/pets')
  })

  test('shows server URL', () => {
    const { lastFrame } = render(
      <RequestPanel endpoint={makeEndpoint()} isFocused={true} servers={defaultServers} securitySchemes={[]} />,
    )
    expect(lastFrame()).toContain('https://api.example.com')
  })

  test('shows "No servers defined" when servers array is empty', () => {
    const { lastFrame } = render(
      <RequestPanel endpoint={makeEndpoint()} isFocused={true} servers={[]} securitySchemes={[]} />,
    )
    expect(lastFrame()).toContain('No servers defined')
  })

  test('shows Send Request button', () => {
    const { lastFrame } = render(
      <RequestPanel endpoint={makeEndpoint()} isFocused={true} servers={defaultServers} securitySchemes={[]} />,
    )
    expect(lastFrame()).toContain('Send Request')
  })

  test('shows response tabs', () => {
    const { lastFrame } = render(
      <RequestPanel endpoint={makeEndpoint()} isFocused={true} servers={defaultServers} securitySchemes={[]} />,
    )
    expect(lastFrame()).toContain('[1] Pretty')
    expect(lastFrame()).toContain('[2] Raw')
    expect(lastFrame()).toContain('[3] Headers')
  })

  test('shows "No response yet" initially', () => {
    const { lastFrame } = render(
      <RequestPanel endpoint={makeEndpoint()} isFocused={true} servers={defaultServers} securitySchemes={[]} />,
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
      <RequestPanel endpoint={endpoint} isFocused={true} servers={defaultServers} securitySchemes={[]} />,
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
      <RequestPanel endpoint={endpoint} isFocused={true} servers={defaultServers} securitySchemes={[]} />,
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
      <RequestPanel endpoint={endpoint} isFocused={true} servers={defaultServers} securitySchemes={[]} />,
    )
    await delay(50)
    // Start at server row (index 0)
    expect(lastFrame()).toContain('Server')

    // Navigate down to auth-toggle
    stdin.write('j')
    await delay(50)
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
      <RequestPanel endpoint={endpoint} isFocused={true} servers={defaultServers} securitySchemes={[]} />,
    )
    await delay(50)

    // Navigate to param row (server → auth-toggle → param)
    stdin.write('j')
    await delay(50)
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
      <RequestPanel endpoint={endpoint} isFocused={true} servers={defaultServers} securitySchemes={[]} />,
    )
    await delay(50)

    // Navigate to param row (server → auth-toggle → param)
    stdin.write('j')
    await delay(50)
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
      <RequestPanel endpoint={makeEndpoint()} isFocused={true} servers={defaultServers} securitySchemes={[]} />,
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
      <RequestPanel endpoint={makeEndpoint()} isFocused={true} servers={defaultServers} securitySchemes={[]} />,
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
      <RequestPanel endpoint={makeEndpoint()} isFocused={true} servers={defaultServers} securitySchemes={[]} />,
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
      <RequestPanel endpoint={makeEndpoint()} isFocused={true} servers={defaultServers} securitySchemes={[]} />,
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
      <RequestPanel endpoint={makeEndpoint()} isFocused={true} servers={servers} securitySchemes={[]} />,
    )
    await delay(50)

    expect(lastFrame()).toContain('https://api.example.com')

    stdin.write('S')
    await delay(50)

    expect(lastFrame()).toContain('https://staging.example.com')
  })
})

describe('RequestPanel - auth toggle', () => {
  test('shows auth toggle row', () => {
    const { lastFrame } = render(
      <RequestPanel endpoint={makeEndpoint()} isFocused={true} servers={defaultServers} securitySchemes={[]} />,
    )
    expect(lastFrame()).toContain('Auth')
  })

  test('a key toggles auth section open', async () => {
    const { lastFrame, stdin } = render(
      <RequestPanel endpoint={makeEndpoint()} isFocused={true} servers={defaultServers} securitySchemes={[]} />,
    )
    await delay(50)

    // Auth should be collapsed — no auth-type row visible
    expect(lastFrame()).not.toContain('Enter to cycle')

    // Press a to toggle
    stdin.write('a')
    await delay(50)

    // Auth should now show type row with cycle hint and token field
    expect(lastFrame()).toContain('Enter to cycle')
    expect(lastFrame()).toContain('Bearer')
  })

  test('a key toggles auth section closed again', async () => {
    const { lastFrame, stdin } = render(
      <RequestPanel endpoint={makeEndpoint()} isFocused={true} servers={defaultServers} securitySchemes={[]} />,
    )
    await delay(50)

    // Open
    stdin.write('a')
    await delay(50)
    expect(lastFrame()).toContain('Bearer')

    // Close
    stdin.write('a')
    await delay(50)

    // Should show collapsed indicator
    expect(lastFrame()).toContain('[+]')
  })

  test('Enter on auth-toggle row toggles auth section', async () => {
    const { lastFrame, stdin } = render(
      <RequestPanel endpoint={makeEndpoint()} isFocused={true} servers={defaultServers} securitySchemes={[]} />,
    )
    await delay(50)

    // Navigate to auth-toggle row (index 1, after server)
    stdin.write('j')
    await delay(50)

    // Press Enter to toggle
    stdin.write('\r')
    await delay(50)

    expect(lastFrame()).toContain('Bearer')
  })

  test('shows spec-derived auth options', () => {
    const schemes: SecuritySchemeInfo[] = [
      { name: 'bearerAuth', type: 'http', scheme: 'bearer' },
      { name: 'apiKeyAuth', type: 'apiKey', in: 'header', paramName: 'X-API-Key' },
    ]
    const { lastFrame, stdin } = render(
      <RequestPanel endpoint={makeEndpoint()} isFocused={true} servers={defaultServers} securitySchemes={schemes} />,
    )

    // Open auth
    stdin.write('a')

    // Should show the first option (bearer)
    expect(lastFrame()).toContain('Bearer')
    expect(lastFrame()).toContain('bearerAuth')
  })

  test('Enter on auth-type row cycles auth option', async () => {
    const { lastFrame, stdin } = render(
      <RequestPanel endpoint={makeEndpoint()} isFocused={true} servers={defaultServers} securitySchemes={[]} />,
    )
    await delay(50)

    // Open auth
    stdin.write('a')
    await delay(50)

    // Navigate to auth-type row (after auth-toggle)
    // Current position is at server (0), auth-toggle (1) — need to go to auth-type (2)
    stdin.write('j')
    await delay(50)
    stdin.write('j')
    await delay(50)

    // Should show Bearer initially
    expect(lastFrame()).toContain('Bearer')

    // Press Enter to cycle
    stdin.write('\r')
    await delay(50)

    // Should now show API Key
    expect(lastFrame()).toContain('API Key')
  })

  test('auth field editing: Enter starts edit, type chars, Enter commits', async () => {
    const { lastFrame, stdin } = render(
      <RequestPanel endpoint={makeEndpoint()} isFocused={true} servers={defaultServers} securitySchemes={[]} />,
    )
    await delay(50)

    // Open auth
    stdin.write('a')
    await delay(50)

    // Navigate to token field: server(0) → auth-toggle(1) → auth-type(2) → auth-field(3)
    stdin.write('j')
    await delay(50)
    stdin.write('j')
    await delay(50)
    stdin.write('j')
    await delay(50)

    // Enter edit mode
    stdin.write('\r')
    await delay(50)

    // Type token
    stdin.write('m')
    await delay(50)
    stdin.write('y')
    await delay(50)
    stdin.write('-')
    await delay(50)
    stdin.write('t')
    await delay(50)
    stdin.write('k')
    await delay(50)

    expect(lastFrame()).toContain('my-tk')

    // Confirm
    stdin.write('\r')
    await delay(50)

    expect(lastFrame()).toContain('my-tk')
  })

  test('auth field editing: Escape cancels edit', async () => {
    const { lastFrame, stdin } = render(
      <RequestPanel endpoint={makeEndpoint()} isFocused={true} servers={defaultServers} securitySchemes={[]} />,
    )
    await delay(50)

    // Open auth
    stdin.write('a')
    await delay(50)

    // Navigate to token field
    stdin.write('j')
    await delay(50)
    stdin.write('j')
    await delay(50)
    stdin.write('j')
    await delay(50)

    // Enter edit mode
    stdin.write('\r')
    await delay(50)

    stdin.write('x')
    await delay(50)
    stdin.write('y')
    await delay(50)

    // Escape
    stdin.write('\x1b')
    await delay(50)

    // Should NOT contain the typed value
    expect(lastFrame()).not.toContain('xy')
  })

  test('auth field editing: backspace deletes characters', async () => {
    const { lastFrame, stdin } = render(
      <RequestPanel endpoint={makeEndpoint()} isFocused={true} servers={defaultServers} securitySchemes={[]} />,
    )
    await delay(50)

    // Open auth, navigate to token field
    stdin.write('a')
    await delay(50)
    stdin.write('j')
    await delay(50)
    stdin.write('j')
    await delay(50)
    stdin.write('j')
    await delay(50)

    // Enter edit mode
    stdin.write('\r')
    await delay(50)

    stdin.write('a')
    await delay(50)
    stdin.write('b')
    await delay(50)
    stdin.write('c')
    await delay(50)

    // Backspace
    stdin.write('\x7f')
    await delay(50)

    expect(lastFrame()).toContain('ab')
    expect(lastFrame()).not.toContain('abc')
  })

  test('basic auth shows username and password fields', async () => {
    const { lastFrame, stdin } = render(
      <RequestPanel endpoint={makeEndpoint()} isFocused={true} servers={defaultServers} securitySchemes={[]} />,
    )
    await delay(50)

    // Open auth
    stdin.write('a')
    await delay(50)

    // Navigate to auth-type and cycle twice: bearer → apiKey → basic
    stdin.write('j')
    await delay(50)
    stdin.write('j')
    await delay(50)
    stdin.write('\r')
    await delay(50)
    stdin.write('\r')
    await delay(50)

    expect(lastFrame()).toContain('Basic')
    expect(lastFrame()).toContain('Username')
    expect(lastFrame()).toContain('Password')
  })

  test('password field is masked', async () => {
    const { lastFrame, stdin } = render(
      <RequestPanel endpoint={makeEndpoint()} isFocused={true} servers={defaultServers} securitySchemes={[]} />,
    )
    await delay(50)

    // Open auth, cycle to basic
    stdin.write('a')
    await delay(50)
    stdin.write('j')
    await delay(50)
    stdin.write('j')
    await delay(50)
    stdin.write('\r')
    await delay(50)
    stdin.write('\r')
    await delay(50)

    // Navigate to password field (auth-toggle → auth-type → username → password)
    // We're on auth-type (index 2). Go to password field.
    stdin.write('j')
    await delay(50)
    stdin.write('j')
    await delay(50)

    // Enter edit mode on password
    stdin.write('\r')
    await delay(50)

    stdin.write('s')
    await delay(50)
    stdin.write('e')
    await delay(50)
    stdin.write('c')
    await delay(50)

    // Commit
    stdin.write('\r')
    await delay(50)

    // Password should be masked
    expect(lastFrame()).toContain('***')
    expect(lastFrame()).not.toContain('sec')
  })

  test('pasting a long JWT token into auth field works without freezing', async () => {
    const jwt = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.dozjgNryP4J3jVmNHl0w5N_XgL0n3I9PlFUP0THsR8U'

    const { lastFrame, stdin } = render(
      <RequestPanel endpoint={makeEndpoint()} isFocused={true} servers={defaultServers} securitySchemes={[]} />,
    )
    await delay(50)

    // Open auth, navigate to token field, enter edit mode
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

    // Simulate paste: write entire JWT as one chunk (best case)
    stdin.write(jwt)
    await delay(100)

    // Should display the full JWT
    expect(lastFrame()).toContain('eyJhbGci')

    // Commit with Enter
    stdin.write('\r')
    await delay(50)

    // Should show the committed value
    expect(lastFrame()).toContain('eyJhbGci')
  })

  test('pasting JWT char-by-char (worst case terminal) still commits correctly', async () => {
    const jwt = 'eyJhbGciOiJIUzI1Ni.test'

    const { lastFrame, stdin } = render(
      <RequestPanel endpoint={makeEndpoint()} isFocused={true} servers={defaultServers} securitySchemes={[]} />,
    )
    await delay(50)

    // Open auth, navigate to token field, enter edit mode
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

    // Simulate worst-case paste: char by char with no delay
    for (const ch of jwt) {
      stdin.write(ch)
    }
    await delay(100)

    // Should display the full pasted text
    expect(lastFrame()).toContain('eyJhbGci')

    // Commit with Enter
    stdin.write('\r')
    await delay(50)

    // Value should be committed (visible as non-editing display)
    expect(lastFrame()).toContain('eyJhbGci')
  })

  test('auth toggle notifies text capture guard', async () => {
    const onCapture = mock((_active: boolean) => {})

    const { stdin } = render(
      <RequestPanel
        endpoint={makeEndpoint()}
        isFocused={true}
        servers={defaultServers}
        securitySchemes={[]}
        onTextCaptureChange={onCapture}
      />,
    )
    await delay(50)

    // Open auth section
    stdin.write('a')
    await delay(50)

    // Navigate to token field and enter edit mode
    stdin.write('j')
    await delay(50)
    stdin.write('j')
    await delay(50)
    stdin.write('j')
    await delay(50)
    stdin.write('\r')
    await delay(50)

    // onCapture should have been called with true
    const calls = onCapture.mock.calls as unknown as [boolean][]
    const lastCallValue = calls[calls.length - 1][0]
    expect(lastCallValue).toBe(true)

    // Exit edit mode
    stdin.write('\x1b')
    await delay(50)

    const calls2 = onCapture.mock.calls as unknown as [boolean][]
    const lastCallValue2 = calls2[calls2.length - 1][0]
    expect(lastCallValue2).toBe(false)
  })
})

describe('RequestPanel - save profile', () => {
  test('W key enters save-name mode with default name', async () => {
    const onSave = mock((_name: string, _url: string, _auth?: SavedAuth, _swaggerUrl?: string) => Promise.resolve(true))
    const { lastFrame, stdin } = render(
      <RequestPanel
        endpoint={makeEndpoint()}
        isFocused={true}
        servers={defaultServers}
        securitySchemes={[]}
        onSaveServerAuth={onSave}
      />,
    )
    await delay(50)

    stdin.write('W')
    await delay(50)

    expect(lastFrame()).toContain('Profile name:')
    expect(lastFrame()).toContain('Enter to save')
    expect(lastFrame()).toContain('Esc to cancel')
  })

  test('Enter in save-name mode triggers save with entered name', async () => {
    const onSave = mock((_name: string, _url: string, _auth?: SavedAuth, _swaggerUrl?: string) => Promise.resolve(true))
    const { stdin } = render(
      <RequestPanel
        endpoint={makeEndpoint()}
        isFocused={true}
        servers={defaultServers}
        securitySchemes={[]}
        onSaveServerAuth={onSave}
      />,
    )
    await delay(50)

    // Enter save mode
    stdin.write('W')
    await delay(50)

    // Press Enter to accept default name
    stdin.write('\r')
    await delay(100)

    expect(onSave).toHaveBeenCalledTimes(1)
    const args = onSave.mock.lastCall as unknown as [string, string, SavedAuth | undefined, string | undefined]
    expect(args[0]).toBe('https://api.example.com') // default name = URL (no description)
    expect(args[1]).toBe('https://api.example.com') // server URL
  })

  test('Escape in save-name mode cancels without saving', async () => {
    const onSave = mock((_name: string, _url: string, _auth?: SavedAuth, _swaggerUrl?: string) => Promise.resolve(true))
    const { lastFrame, stdin } = render(
      <RequestPanel
        endpoint={makeEndpoint()}
        isFocused={true}
        servers={defaultServers}
        securitySchemes={[]}
        onSaveServerAuth={onSave}
      />,
    )
    await delay(50)

    stdin.write('W')
    await delay(50)
    expect(lastFrame()).toContain('Profile name:')

    stdin.write('\x1b')
    await delay(50)

    expect(onSave).not.toHaveBeenCalled()
    expect(lastFrame()).not.toContain('Profile name:')
  })

  test('typing in save-name mode updates the name', async () => {
    const onSave = mock((_name: string, _url: string, _auth?: SavedAuth, _swaggerUrl?: string) => Promise.resolve(true))
    const { lastFrame, stdin } = render(
      <RequestPanel
        endpoint={makeEndpoint()}
        isFocused={true}
        servers={defaultServers}
        securitySchemes={[]}
        onSaveServerAuth={onSave}
      />,
    )
    await delay(50)

    stdin.write('W')
    await delay(50)

    // The buffer starts with a default name. Typing appends to the buffer.
    stdin.write('X')
    await delay(50)

    expect(lastFrame()).toContain('X')

    stdin.write('\r')
    await delay(100)

    const args = onSave.mock.lastCall as unknown as [string, string, SavedAuth | undefined, string | undefined]
    // Name should be the default name + "X"
    expect(args[0]).toContain('X')
  })

  test('save includes specLoadUrl as swaggerEndpointUrl', async () => {
    const onSave = mock((_name: string, _url: string, _auth?: SavedAuth, _swaggerUrl?: string) => Promise.resolve(true))
    const { stdin } = render(
      <RequestPanel
        endpoint={makeEndpoint()}
        isFocused={true}
        servers={defaultServers}
        securitySchemes={[]}
        onSaveServerAuth={onSave}
        specLoadUrl="https://api.example.com/swagger.json"
      />,
    )
    await delay(50)

    stdin.write('W')
    await delay(50)
    stdin.write('\r')
    await delay(100)

    const args = onSave.mock.lastCall as unknown as [string, string, SavedAuth | undefined, string | undefined]
    expect(args[3]).toBe('https://api.example.com/swagger.json')
  })

  test('save-name mode activates text capture guard', async () => {
    const onCapture = mock((_active: boolean) => {})
    const onSave = mock((_name: string, _url: string, _auth?: SavedAuth, _swaggerUrl?: string) => Promise.resolve(true))
    const { stdin } = render(
      <RequestPanel
        endpoint={makeEndpoint()}
        isFocused={true}
        servers={defaultServers}
        securitySchemes={[]}
        onTextCaptureChange={onCapture}
        onSaveServerAuth={onSave}
      />,
    )
    await delay(50)

    stdin.write('W')
    await delay(50)

    const calls = onCapture.mock.calls as unknown as [boolean][]
    const lastCallValue = calls[calls.length - 1][0]
    expect(lastCallValue).toBe(true)

    // Cancel
    stdin.write('\x1b')
    await delay(50)

    const calls2 = onCapture.mock.calls as unknown as [boolean][]
    const lastCallValue2 = calls2[calls2.length - 1][0]
    expect(lastCallValue2).toBe(false)
  })

  test('successful save shows confirmation message', async () => {
    const onSave = mock((_name: string, _url: string, _auth?: SavedAuth, _swaggerUrl?: string) => Promise.resolve(true))
    const { lastFrame, stdin } = render(
      <RequestPanel
        endpoint={makeEndpoint()}
        isFocused={true}
        servers={defaultServers}
        securitySchemes={[]}
        onSaveServerAuth={onSave}
      />,
    )
    await delay(50)

    stdin.write('W')
    await delay(50)
    stdin.write('\r')
    await delay(100)

    expect(lastFrame()).toContain('Saved to')
  })
})

describe('RequestPanel - saved request base URL injection', () => {
  test('savedRequestBaseUrl appears as server when not in spec servers', async () => {
    const { lastFrame } = render(
      <RequestPanel
        endpoint={makeEndpoint()}
        isFocused={true}
        servers={defaultServers}
        securitySchemes={[]}
        savedRequestBaseUrl="https://saved-override.example.com"
      />,
    )
    await delay(50)

    // The saved URL should be the displayed server (injected at index 0)
    expect(lastFrame()).toContain('https://saved-override.example.com')
  })

  test('savedRequestBaseUrl is pre-selected as default server', async () => {
    const servers: ServerInfo[] = [
      { url: 'https://api.example.com', variables: new Map() },
      { url: 'https://staging.example.com', variables: new Map() },
    ]
    const { lastFrame } = render(
      <RequestPanel
        endpoint={makeEndpoint()}
        isFocused={true}
        servers={servers}
        securitySchemes={[]}
        savedRequestBaseUrl="https://saved-override.example.com"
      />,
    )
    await delay(50)

    // Saved URL should be shown as current server (it's injected at index 0)
    expect(lastFrame()).toContain('https://saved-override.example.com')
    expect(lastFrame()).not.toContain('https://api.example.com')
  })

  test('savedRequestBaseUrl is not duplicated when it matches a spec server', async () => {
    const { lastFrame, stdin } = render(
      <RequestPanel
        endpoint={makeEndpoint()}
        isFocused={true}
        servers={defaultServers}
        securitySchemes={[]}
        savedRequestBaseUrl="https://api.example.com"
      />,
    )
    await delay(50)

    // Should show the matching server
    expect(lastFrame()).toContain('https://api.example.com')

    // Cycle — should NOT show saved URL as a separate entry
    // With one spec server + no duplicate injection, cycling should wrap back to the same
    stdin.write('S')
    await delay(50)
    expect(lastFrame()).toContain('https://api.example.com')
  })

  test('cycling through servers includes injected savedRequestBaseUrl', async () => {
    const { lastFrame, stdin } = render(
      <RequestPanel
        endpoint={makeEndpoint()}
        isFocused={true}
        servers={defaultServers}
        securitySchemes={[]}
        savedRequestBaseUrl="https://saved-override.example.com"
      />,
    )
    await delay(50)

    // Initially shows saved URL (index 0)
    expect(lastFrame()).toContain('https://saved-override.example.com')

    // Cycle to next (spec server)
    stdin.write('S')
    await delay(50)
    expect(lastFrame()).toContain('https://api.example.com')

    // Cycle back to saved
    stdin.write('S')
    await delay(50)
    expect(lastFrame()).toContain('https://saved-override.example.com')
  })

  test('send request uses injected savedRequestBaseUrl', async () => {
    globalThis.fetch = mock(() =>
      Promise.resolve(new Response('{"ok": true}', {
        status: 200,
        statusText: 'OK',
      })),
    ) as unknown as typeof fetch

    const { lastFrame, stdin } = render(
      <RequestPanel
        endpoint={makeEndpoint()}
        isFocused={true}
        servers={defaultServers}
        securitySchemes={[]}
        savedRequestBaseUrl="https://saved-override.example.com"
      />,
    )
    await delay(50)

    // Send request (should use the injected server at index 0)
    stdin.write('s')
    await delay(300)

    expect(lastFrame()).toContain('200')

    // Verify fetch was called with the saved URL
    const fetchMock = globalThis.fetch as unknown as ReturnType<typeof mock>
    const callArgs = fetchMock.mock.calls[0] as unknown as [string, RequestInit]
    expect(callArgs[0]).toContain('https://saved-override.example.com')
  })

  test('savedRequestBaseUrl matching non-first spec server is preselected', async () => {
    const servers: ServerInfo[] = [
      { url: 'https://api.example.com', variables: new Map() },
      { url: 'https://staging.example.com', variables: new Map() },
      { url: 'https://saved.example.com', variables: new Map() },
    ]
    const { lastFrame } = render(
      <RequestPanel
        endpoint={makeEndpoint()}
        isFocused={true}
        servers={servers}
        securitySchemes={[]}
        savedRequestBaseUrl="https://staging.example.com"
      />,
    )
    await delay(50)

    // staging server should be reordered to index 0 and displayed
    expect(lastFrame()).toContain('https://staging.example.com')
    expect(lastFrame()).not.toContain('https://api.example.com')
  })

  test('no injection when savedRequestBaseUrl is undefined', () => {
    const { lastFrame } = render(
      <RequestPanel
        endpoint={makeEndpoint()}
        isFocused={true}
        servers={defaultServers}
        securitySchemes={[]}
      />,
    )

    // Should show spec server as normal
    expect(lastFrame()).toContain('https://api.example.com')
  })
})

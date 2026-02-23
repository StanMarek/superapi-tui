import { describe, it, expect, mock, beforeEach } from 'bun:test'
import { render } from 'ink-testing-library'
import type { ParsedSpec } from '@/types/index.js'
import type { ConfigData } from '@/config/types.js'

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

const defaultConfig: ConfigData = {
  servers: [],
  preferences: { defaultResponseTab: 'pretty' },
}

const mockLoadSpec = mock(() => Promise.resolve({ content: '{}', source: 'file' as const }))
const mockParseSpec = mock(() =>
  Promise.resolve({
    title: 'Test API',
    version: '1.0.0',
    tagGroups: [],
    servers: [],
    securitySchemes: [],
    info: { title: 'Test API', version: '1.0.0' },
    endpoints: [],
    tags: [],
    globalSecurity: [],
    componentSchemas: new Map(),
  } as unknown as ParsedSpec),
)
const mockLoadConfig = mock(() => Promise.resolve(defaultConfig))

mock.module('@/loader/index.js', () => ({
  loadSpec: mockLoadSpec,
}))

mock.module('@/parser/index.js', () => ({
  parseSpec: mockParseSpec,
}))

mock.module('@/config/index.js', () => ({
  loadConfig: mockLoadConfig,
  saveConfig: mock(() => Promise.resolve()),
  getConfigPath: () => '/tmp/.superapi-tui.json',
  matchServerAuth: () => undefined,
  DEFAULT_CONFIG: defaultConfig,
  DEFAULT_PREFERENCES: defaultConfig.preferences,
  ConfigError: class ConfigError extends Error {},
}))

// Import after mocks are set up
const { SpecLoader } = await import('@/components/SpecLoader.js')

beforeEach(() => {
  mockLoadSpec.mockClear()
  mockParseSpec.mockClear()
  mockLoadConfig.mockClear()
  mockLoadConfig.mockResolvedValue(defaultConfig)
})

describe('SpecLoader', () => {
  it('shows launcher when no input provided', async () => {
    const { lastFrame } = render(<SpecLoader input={undefined} />)
    await delay(50)
    const frame = lastFrame()!
    // Launcher renders with the app name and URL input (no saved servers → text input)
    expect(frame).toContain('superapi-tui')
    expect(frame).toContain('Enter a spec URL or file path')
  })

  it('transitions from launcher to loading when URL is entered', async () => {
    // Make loadSpec hang so we can observe the loading state
    mockLoadSpec.mockReturnValueOnce(new Promise(() => {}))

    const { lastFrame, stdin } = render(<SpecLoader input={undefined} />)
    await delay(50)

    // Type a URL and submit in the Launcher text input
    stdin.write('https://example.com/api.json')
    await delay(50)
    stdin.write('\r')
    await delay(50)

    const frame = lastFrame()!
    expect(frame).toContain('Loading')
    expect(frame).toContain('example.com/api.json')
  })

  it('shows loading state when input provided', () => {
    const { lastFrame } = render(<SpecLoader input="./test.yaml" />)
    const frame = lastFrame()!
    expect(frame).toContain('Loading')
  })

  it('shows error state when loading fails', async () => {
    mockLoadSpec.mockRejectedValueOnce(new Error('File not found'))
    const { lastFrame } = render(<SpecLoader input="./missing.yaml" />)
    await delay(100)
    const frame = lastFrame()!
    expect(frame).toContain('Error')
    expect(frame).toContain('File not found')
  })

  it('renders App after successful load and parse', async () => {
    mockLoadSpec.mockResolvedValueOnce({ content: '{}', source: 'file' as const })
    mockParseSpec.mockResolvedValueOnce({
      title: 'Pet Store',
      version: '1.0.0',
      info: { title: 'Pet Store', version: '1.0.0' },
      tagGroups: [
        {
          name: 'pets',
          endpoints: [
            {
              id: 'get-pets',
              path: '/pets',
              method: 'get' as const,
              summary: 'List pets',
              deprecated: false,
              tags: ['pets'],
              parameters: [],
              responses: [],
            },
          ],
        },
      ],
      endpoints: [],
      tags: ['pets'],
      servers: [],
      securitySchemes: [],
      globalSecurity: [],
      componentSchemas: new Map(),
    } as unknown as ParsedSpec)

    const { lastFrame } = render(<SpecLoader input="./petstore.yaml" />)
    await delay(100)
    const frame = lastFrame()!
    // App renders 3 panels — check for the panel headers
    expect(frame).toContain('Endpoints')
  })
})

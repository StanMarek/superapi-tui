import { describe, it, expect, mock, beforeEach } from 'bun:test'
import { render } from 'ink-testing-library'
import { SpecLoader } from '@/components/SpecLoader.js'
import type { ParsedSpec } from '@/types/index.js'
import type { ConfigData } from '@/config/types.js'

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

const defaultConfig: ConfigData = {
  servers: [],
  preferences: { defaultResponseTab: 'pretty' },
}

const mockLoadSpec = mock(() =>
  Promise.resolve({ content: '{}', format: 'json' as const, inputType: 'file' as const, source: 'file' }),
)
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

beforeEach(() => {
  mockLoadSpec.mockClear()
  mockParseSpec.mockClear()
  mockLoadConfig.mockClear()
  mockLoadConfig.mockResolvedValue(defaultConfig)
})

const specDeps = { loadSpec: mockLoadSpec, parseSpec: mockParseSpec }
const launcherDeps = { loadConfig: mockLoadConfig }

describe('SpecLoader', () => {
  it('shows launcher when no input provided', async () => {
    const { lastFrame } = render(
      <SpecLoader input={undefined} deps={specDeps} launcherDeps={launcherDeps} />,
    )
    await delay(50)
    const frame = lastFrame()!
    expect(frame).toContain('superapi-tui')
    expect(frame).toContain('Enter a spec URL or file path')
  })

  it('transitions from launcher to loading when URL is entered', async () => {
    mockLoadSpec.mockReturnValueOnce(new Promise(() => {}))
    const { lastFrame, stdin } = render(
      <SpecLoader input={undefined} deps={specDeps} launcherDeps={launcherDeps} />,
    )
    await delay(50)
    stdin.write('https://example.com/api.json')
    await delay(50)
    stdin.write('\r')
    await delay(50)
    const frame = lastFrame()!
    expect(frame).toContain('Loading')
    expect(frame).toContain('example.com/api.json')
  })

  it('shows loading state when input provided', () => {
    const { lastFrame } = render(
      <SpecLoader input="./test.yaml" deps={specDeps} launcherDeps={launcherDeps} />,
    )
    const frame = lastFrame()!
    expect(frame).toContain('Loading')
  })

  it('shows error state when loading fails', async () => {
    mockLoadSpec.mockRejectedValueOnce(new Error('File not found'))
    const { lastFrame } = render(
      <SpecLoader input="./missing.yaml" deps={specDeps} launcherDeps={launcherDeps} />,
    )
    await delay(100)
    const frame = lastFrame()!
    expect(frame).toContain('Error')
    expect(frame).toContain('File not found')
  })

  it('renders App after successful load and parse', async () => {
    mockLoadSpec.mockResolvedValueOnce({ content: '{}', format: 'json' as const, inputType: 'file' as const, source: 'file' })
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

    const { lastFrame } = render(
      <SpecLoader input="./petstore.yaml" deps={specDeps} launcherDeps={launcherDeps} />,
    )
    await delay(100)
    const frame = lastFrame()!
    expect(frame).toContain('Endpoints')
  })
})

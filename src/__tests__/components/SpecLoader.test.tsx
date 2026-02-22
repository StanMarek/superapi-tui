import { describe, it, expect, mock, beforeEach } from 'bun:test'
import { render } from 'ink-testing-library'
import type { ParsedSpec } from '@/types/index.js'

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

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

mock.module('@/loader/index.js', () => ({
  loadSpec: mockLoadSpec,
}))

mock.module('@/parser/index.js', () => ({
  parseSpec: mockParseSpec,
}))

// Import after mocks are set up
const { SpecLoader } = await import('@/components/SpecLoader.js')

beforeEach(() => {
  mockLoadSpec.mockClear()
  mockParseSpec.mockClear()
})

describe('SpecLoader', () => {
  it('shows usage when no input provided', () => {
    const { lastFrame } = render(<SpecLoader input={undefined} />)
    const frame = lastFrame()!
    expect(frame).toContain('Usage')
    expect(frame).toContain('superapi-tui')
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

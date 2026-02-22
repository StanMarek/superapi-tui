import { describe, it, expect } from 'bun:test'
import { render } from 'ink-testing-library'
import App from '../App.js'
import type { ParsedSpec } from '@/types/index.js'

const minimalSpec: ParsedSpec = {
  info: {
    title: 'Test API',
    version: '1.0.0',
    specVersion: '3.0.0',
  },
  servers: [],
  tagGroups: [
    {
      name: 'default',
      endpoints: [
        {
          id: 'get-/health',
          method: 'get',
          path: '/health',
          summary: 'Health check',
          tags: ['default'],
          deprecated: false,
          parameters: [],
          responses: [],
        },
      ],
    },
  ],
  endpoints: [
    {
      id: 'get-/health',
      method: 'get',
      path: '/health',
      summary: 'Health check',
      tags: ['default'],
      deprecated: false,
      parameters: [],
      responses: [],
    },
  ],
  tags: ['default'],
  securitySchemes: [],
  globalSecurity: [],
  componentSchemas: new Map(),
}

describe('App', () => {
  it('renders three panels', () => {
    const { lastFrame } = render(<App spec={minimalSpec} />)
    const frame = lastFrame()!
    expect(frame).toContain('Endpoints')
    expect(frame).toContain('Endpoint Detail')
    expect(frame).toContain('Request / Response')
  })

  it('renders endpoint list content', () => {
    const { lastFrame } = render(<App spec={minimalSpec} />)
    const frame = lastFrame()!
    expect(frame).toContain('GET')
    expect(frame).toContain('/health')
  })

  it('shows "No endpoint selected" in detail and request panels', () => {
    const { lastFrame } = render(<App spec={minimalSpec} />)
    const frame = lastFrame()!
    expect(frame).toContain('No endpoint selected')
  })
})

import { describe, it, expect } from 'bun:test'
import { render } from 'ink-testing-library'
import { EndpointDetail } from '@/components/EndpointDetail.js'
import type { Endpoint, SchemaInfo } from '@/types/index.js'

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

function schema(overrides: Partial<SchemaInfo> & { type: SchemaInfo['type'] }): SchemaInfo {
  return {
    displayType: overrides.type,
    nullable: false,
    readOnly: false,
    writeOnly: false,
    ...overrides,
  }
}

const userSchema = schema({
  type: 'object',
  displayType: 'User',
  refName: 'User',
  properties: new Map([
    ['id', schema({ type: 'integer', displayType: 'integer' })],
    ['name', schema({ type: 'string', displayType: 'string' })],
  ]),
})

const componentSchemas: ReadonlyMap<string, SchemaInfo> = new Map([
  ['User', userSchema],
])

const endpointWithDetails: Endpoint = {
  id: 'get-/users/{userId}',
  method: 'get',
  path: '/users/{userId}',
  summary: 'Get user by ID',
  tags: ['users'],
  deprecated: false,
  parameters: [
    {
      name: 'userId',
      location: 'path',
      required: true,
      deprecated: false,
      schema: schema({ type: 'integer', displayType: 'integer' }),
    },
    {
      name: 'include',
      location: 'query',
      required: false,
      deprecated: false,
      schema: schema({ type: 'string', displayType: 'string', enumValues: ['profile', 'posts'] }),
    },
  ],
  responses: [
    {
      statusCode: '200',
      description: 'Success',
      content: [{ mediaType: 'application/json', schema: userSchema }],
      headers: [],
    },
    {
      statusCode: '404',
      description: 'Not found',
      content: [],
      headers: [],
    },
  ],
}

const endpointWithBody: Endpoint = {
  id: 'post-/users',
  method: 'post',
  path: '/users',
  summary: 'Create user',
  tags: ['users'],
  deprecated: false,
  parameters: [],
  requestBody: {
    required: true,
    content: [
      {
        mediaType: 'application/json',
        schema: schema({
          type: 'object',
          displayType: 'object',
          properties: new Map([
            ['name', schema({ type: 'string', displayType: 'string' })],
            ['email', schema({ type: 'string', displayType: 'string', format: 'email' })],
          ]),
          required: ['name', 'email'],
        }),
      },
    ],
  },
  responses: [
    {
      statusCode: '201',
      description: 'Created',
      content: [{ mediaType: 'application/json', schema: userSchema }],
      headers: [],
    },
  ],
}

describe('EndpointDetail', () => {
  describe('Empty state', () => {
    it('shows placeholder when no endpoint selected', () => {
      const { lastFrame } = render(
        <EndpointDetail endpoint={null} isFocused={false} componentSchemas={new Map()} />,
      )
      expect(lastFrame()!).toContain('No endpoint selected')
    })
  })

  describe('Endpoint header', () => {
    it('shows method and path', () => {
      const { lastFrame } = render(
        <EndpointDetail endpoint={endpointWithDetails} isFocused={false} componentSchemas={componentSchemas} />,
      )
      const frame = lastFrame()!
      expect(frame).toContain('GET')
      expect(frame).toContain('/users/{userId}')
    })

    it('shows summary', () => {
      const { lastFrame } = render(
        <EndpointDetail endpoint={endpointWithDetails} isFocused={false} componentSchemas={componentSchemas} />,
      )
      expect(lastFrame()!).toContain('Get user by ID')
    })
  })

  describe('Sections', () => {
    it('shows section headers collapsed by default', () => {
      const { lastFrame } = render(
        <EndpointDetail endpoint={endpointWithDetails} isFocused={false} componentSchemas={componentSchemas} />,
      )
      const frame = lastFrame()!
      expect(frame).toContain('Parameters')
      expect(frame).toContain('Responses')
      // Collapsed arrow
      expect(frame).toContain('\u25b6')
      // Section content should NOT be visible (only headers)
      expect(frame).not.toContain('include')
      expect(frame).not.toContain('200')
    })

    it('shows parameter names after expanding Parameters section', async () => {
      const { lastFrame, stdin } = render(
        <EndpointDetail endpoint={endpointWithDetails} isFocused={true} componentSchemas={componentSchemas} />,
      )
      // Cursor starts on Parameters header (collapsed). Press Enter to expand.
      stdin.write('\r')
      await delay(50)
      const frame = lastFrame()!
      expect(frame).toContain('userId')
      expect(frame).toContain('include')
    })

    it('shows Responses content after expanding Responses section', async () => {
      const { lastFrame, stdin } = render(
        <EndpointDetail endpoint={endpointWithDetails} isFocused={true} componentSchemas={componentSchemas} />,
      )
      // Navigate to Responses header (skip Parameters header)
      stdin.write('j')
      await delay(50)
      // Expand Responses
      stdin.write('\r')
      await delay(50)
      const frame = lastFrame()!
      expect(frame).toContain('Responses')
      expect(frame).toContain('200')
      expect(frame).toContain('404')
    })

    it('shows Request Body content after expanding for POST endpoints', async () => {
      const { lastFrame, stdin } = render(
        <EndpointDetail endpoint={endpointWithBody} isFocused={true} componentSchemas={componentSchemas} />,
      )
      // Cursor starts on Request Body header (collapsed). Press Enter to expand.
      stdin.write('\r')
      await delay(50)
      const frame = lastFrame()!
      expect(frame).toContain('Request Body')
      expect(frame).toContain('name')
      expect(frame).toContain('email')
    })

    it('does not show Request Body section when endpoint has no body', () => {
      const { lastFrame } = render(
        <EndpointDetail endpoint={endpointWithDetails} isFocused={false} componentSchemas={componentSchemas} />,
      )
      expect(lastFrame()!).not.toContain('Request Body')
    })
  })

  describe('Section collapsing', () => {
    it('expands then collapses section with Enter toggle', async () => {
      const { lastFrame, stdin } = render(
        <EndpointDetail endpoint={endpointWithDetails} isFocused={true} componentSchemas={componentSchemas} />,
      )
      // Sections start collapsed — content hidden
      expect(lastFrame()!).not.toContain('include')
      // Enter expands Parameters
      stdin.write('\r')
      await delay(50)
      expect(lastFrame()!).toContain('include')
      // Enter collapses again
      stdin.write('\r')
      await delay(50)
      expect(lastFrame()!).not.toContain('include')
      expect(lastFrame()!).toContain('\u25b6')
    })
  })

  describe('Schema navigation', () => {
    it('shows User ref in Responses section after expanding', async () => {
      const { lastFrame, stdin } = render(
        <EndpointDetail endpoint={endpointWithDetails} isFocused={true} componentSchemas={componentSchemas} />,
      )
      // Navigate to Responses header and expand
      stdin.write('j')
      await delay(50)
      stdin.write('\r')
      await delay(50)
      expect(lastFrame()!).toContain('User')
    })

    it('shows section headers on initial render', () => {
      const { lastFrame } = render(
        <EndpointDetail endpoint={endpointWithDetails} isFocused={true} componentSchemas={componentSchemas} />,
      )
      const frame = lastFrame()!
      expect(frame).toContain('Parameters')
      expect(frame).toContain('Responses')
    })
  })

  describe('h/l collapse/expand', () => {
    it('expands collapsed section with l key', async () => {
      const { lastFrame, stdin } = render(
        <EndpointDetail endpoint={endpointWithDetails} isFocused={true} componentSchemas={componentSchemas} />,
      )
      // Starts collapsed
      expect(lastFrame()!).not.toContain('include')
      // l on Parameters header expands it
      stdin.write('l')
      await delay(50)
      expect(lastFrame()!).toContain('include')
    })

    it('collapses expanded section with h key', async () => {
      const { lastFrame, stdin } = render(
        <EndpointDetail endpoint={endpointWithDetails} isFocused={true} componentSchemas={componentSchemas} />,
      )
      // Expand first
      stdin.write('l')
      await delay(50)
      expect(lastFrame()!).toContain('include')
      // h collapses
      stdin.write('h')
      await delay(50)
      expect(lastFrame()!).not.toContain('include')
    })
  })

  describe('State reset on endpoint change', () => {
    it('collapses all sections when endpoint changes', async () => {
      const { lastFrame, stdin, rerender } = render(
        <EndpointDetail endpoint={endpointWithDetails} isFocused={true} componentSchemas={componentSchemas} />,
      )
      // Expand Parameters section
      stdin.write('\r')
      await delay(50)
      expect(lastFrame()!).toContain('include')
      // Switch endpoint
      rerender(
        <EndpointDetail endpoint={endpointWithBody} isFocused={true} componentSchemas={componentSchemas} />,
      )
      await delay(50)
      // New endpoint should have collapsed sections
      const frame = lastFrame()!
      expect(frame).toContain('Request Body')
      expect(frame).toContain('\u25b6') // collapsed
      expect(frame).not.toContain('name')
    })
  })
})

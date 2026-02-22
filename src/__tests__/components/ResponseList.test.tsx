import { describe, it, expect } from 'bun:test'
import { render } from 'ink-testing-library'
import { ResponseList } from '@/components/ResponseList.js'
import type { ResponseInfo, SchemaInfo } from '@/types/index.js'

function schema(overrides: Partial<SchemaInfo> & { type: SchemaInfo['type'] }): SchemaInfo {
  return {
    displayType: overrides.type,
    nullable: false,
    readOnly: false,
    writeOnly: false,
    ...overrides,
  }
}

const responses: readonly ResponseInfo[] = [
  {
    statusCode: '200',
    description: 'Successful response',
    content: [
      {
        mediaType: 'application/json',
        schema: schema({
          type: 'object',
          displayType: 'object',
          refName: 'Pet',
          properties: new Map([
            ['id', schema({ type: 'integer', displayType: 'integer' })],
            ['name', schema({ type: 'string', displayType: 'string' })],
          ]),
        }),
      },
    ],
    headers: [],
  },
  {
    statusCode: '404',
    description: 'Not found',
    content: [
      {
        mediaType: 'application/json',
        schema: schema({
          type: 'object',
          displayType: 'object',
          properties: new Map([
            ['message', schema({ type: 'string', displayType: 'string' })],
          ]),
        }),
      },
    ],
    headers: [],
  },
  {
    statusCode: '500',
    description: 'Server error',
    content: [],
    headers: [],
  },
]

describe('ResponseList', () => {
  it('renders status codes with descriptions', () => {
    const { lastFrame } = render(
      <ResponseList responses={responses} onNavigateRef={() => {}} />,
    )
    const frame = lastFrame()!
    expect(frame).toContain('200')
    expect(frame).toContain('Successful response')
    expect(frame).toContain('404')
    expect(frame).toContain('Not found')
    expect(frame).toContain('500')
    expect(frame).toContain('Server error')
  })

  it('renders media types', () => {
    const { lastFrame } = render(
      <ResponseList responses={responses} onNavigateRef={() => {}} />,
    )
    const frame = lastFrame()!
    expect(frame).toContain('application/json')
  })

  it('renders response schemas', () => {
    const { lastFrame } = render(
      <ResponseList responses={responses} onNavigateRef={() => {}} />,
    )
    const frame = lastFrame()!
    expect(frame).toContain('id')
    expect(frame).toContain('name')
  })

  it('shows no content indicator for empty response bodies', () => {
    const { lastFrame } = render(
      <ResponseList responses={responses} onNavigateRef={() => {}} />,
    )
    const frame = lastFrame()!
    expect(frame).toContain('no content')
  })

  it('renders empty state when no responses', () => {
    const { lastFrame } = render(
      <ResponseList responses={[]} onNavigateRef={() => {}} />,
    )
    const frame = lastFrame()!
    expect(frame).toContain('No responses')
  })

  it('shows ref name for response schemas with $ref', () => {
    const { lastFrame } = render(
      <ResponseList responses={responses} onNavigateRef={() => {}} />,
    )
    const frame = lastFrame()!
    expect(frame).toContain('Pet')
  })

  it('renders response headers when present', () => {
    const responsesWithHeaders: readonly ResponseInfo[] = [
      {
        statusCode: '200',
        description: 'OK',
        content: [],
        headers: [
          {
            name: 'X-Rate-Limit',
            description: 'Rate limit',
            schema: schema({ type: 'integer', displayType: 'integer' }),
            required: false,
          },
          {
            name: 'X-Request-Id',
            description: 'Request ID',
            schema: schema({ type: 'string', displayType: 'string' }),
            required: false,
          },
        ],
      },
    ]
    const { lastFrame } = render(
      <ResponseList responses={responsesWithHeaders} onNavigateRef={() => {}} />,
    )
    const frame = lastFrame()!
    expect(frame).toContain('Headers')
    expect(frame).toContain('X-Rate-Limit')
    expect(frame).toContain('integer')
    expect(frame).toContain('X-Request-Id')
    expect(frame).toContain('string')
  })
})

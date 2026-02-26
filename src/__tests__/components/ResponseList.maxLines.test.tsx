import { describe, test, expect, mock } from 'bun:test'
import { render } from 'ink-testing-library'
import { ResponseList } from '@/components/ResponseList.js'
import type { ResponseInfo, SchemaInfo } from '@/types/index.js'

function makeSchema(fieldCount: number): SchemaInfo {
  const properties = new Map<string, SchemaInfo>()
  for (let i = 0; i < fieldCount; i++) {
    properties.set(`field${i}`, {
      type: 'string',
      displayType: 'string',
      nullable: false,
      readOnly: false,
      writeOnly: false,
    })
  }
  return {
    type: 'object',
    displayType: 'object',
    nullable: false,
    readOnly: false,
    writeOnly: false,
    properties,
  }
}

function makeResponses(count: number, schemaFieldCount: number = 3): readonly ResponseInfo[] {
  return Array.from({ length: count }, (_, i) => ({
    statusCode: `${200 + i}`,
    description: `Response ${i}`,
    content: [{
      mediaType: 'application/json',
      schema: makeSchema(schemaFieldCount),
    }],
    headers: [],
  }))
}

describe('ResponseList maxLines', () => {
  test('truncates output when maxLines is set and exceeded', () => {
    const responses = makeResponses(10, 5)
    const onNav = mock(() => {})
    const { lastFrame } = render(<ResponseList responses={responses} onNavigateRef={onNav} maxLines={8} />)
    const frame = lastFrame()!
    expect(frame).toContain('more')
    // Should not show all 10 responses
    const responseMatches = frame.match(/Response \d+/g) ?? []
    expect(responseMatches.length).toBeLessThan(10)
  })

  test('renders all responses without maxLines', () => {
    const responses = makeResponses(5, 2)
    const onNav = mock(() => {})
    const { lastFrame } = render(<ResponseList responses={responses} onNavigateRef={onNav} />)
    const frame = lastFrame()!
    const responseMatches = frame.match(/Response \d+/g) ?? []
    expect(responseMatches.length).toBe(5)
  })

  test('renders all responses when within maxLines budget', () => {
    const responses = makeResponses(2, 1)
    const onNav = mock(() => {})
    const { lastFrame } = render(<ResponseList responses={responses} onNavigateRef={onNav} maxLines={30} />)
    const frame = lastFrame()!
    const responseMatches = frame.match(/Response \d+/g) ?? []
    expect(responseMatches.length).toBe(2)
    expect(frame).not.toContain('more responses')
  })

  test('shows remaining count in truncation message', () => {
    const responses = makeResponses(8, 5)
    const onNav = mock(() => {})
    const { lastFrame } = render(<ResponseList responses={responses} onNavigateRef={onNav} maxLines={5} />)
    const frame = lastFrame()!
    expect(frame).toMatch(/\d+ more/)
  })
})

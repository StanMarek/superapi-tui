import { describe, it, expect } from 'bun:test'
import { render } from 'ink-testing-library'
import { ParameterList } from '@/components/ParameterList.js'
import type { ParameterInfo } from '@/types/index.js'

function param(overrides: Partial<ParameterInfo> & { name: string; location: ParameterInfo['location'] }): ParameterInfo {
  return {
    required: false,
    deprecated: false,
    ...overrides,
  }
}

const parameters: readonly ParameterInfo[] = [
  param({
    name: 'petId',
    location: 'path',
    required: true,
    schema: { type: 'integer', displayType: 'integer', nullable: false, readOnly: false, writeOnly: false },
  }),
  param({
    name: 'page',
    location: 'query',
    schema: { type: 'integer', displayType: 'integer', nullable: false, readOnly: false, writeOnly: false },
  }),
  param({
    name: 'limit',
    location: 'query',
    schema: { type: 'integer', displayType: 'integer', nullable: false, readOnly: false, writeOnly: false },
  }),
  param({
    name: 'X-Request-Id',
    location: 'header',
    schema: { type: 'string', displayType: 'string', nullable: false, readOnly: false, writeOnly: false },
  }),
]

describe('ParameterList', () => {
  it('renders parameters grouped by location', () => {
    const { lastFrame } = render(<ParameterList parameters={parameters} />)
    const frame = lastFrame()!
    expect(frame).toContain('Path')
    expect(frame).toContain('Query')
    expect(frame).toContain('Header')
  })

  it('renders parameter names and types', () => {
    const { lastFrame } = render(<ParameterList parameters={parameters} />)
    const frame = lastFrame()!
    expect(frame).toContain('petId')
    expect(frame).toContain('integer')
    expect(frame).toContain('page')
    expect(frame).toContain('limit')
    expect(frame).toContain('X-Request-Id')
    expect(frame).toContain('string')
  })

  it('marks required parameters', () => {
    const { lastFrame } = render(<ParameterList parameters={parameters} />)
    const frame = lastFrame()!
    // petId is required — should have marker
    expect(frame).toContain('*')
  })

  it('renders deprecated parameters with strikethrough indicator', () => {
    const deprecatedParams: readonly ParameterInfo[] = [
      param({
        name: 'oldParam',
        location: 'query',
        deprecated: true,
        schema: { type: 'string', displayType: 'string', nullable: false, readOnly: false, writeOnly: false },
      }),
    ]
    const { lastFrame } = render(<ParameterList parameters={deprecatedParams} />)
    const frame = lastFrame()!
    expect(frame).toContain('oldParam')
    // Deprecated indicator
    expect(frame).toContain('deprecated')
  })

  it('renders empty state when no parameters', () => {
    const { lastFrame } = render(<ParameterList parameters={[]} />)
    const frame = lastFrame()!
    expect(frame).toContain('No parameters')
  })

  it('shows enum values for parameters with enums', () => {
    const enumParams: readonly ParameterInfo[] = [
      param({
        name: 'sort',
        location: 'query',
        schema: {
          type: 'string',
          displayType: 'string',
          nullable: false,
          readOnly: false,
          writeOnly: false,
          enumValues: ['asc', 'desc'],
        },
      }),
    ]
    const { lastFrame } = render(<ParameterList parameters={enumParams} />)
    const frame = lastFrame()!
    expect(frame).toContain('asc')
    expect(frame).toContain('desc')
  })
})

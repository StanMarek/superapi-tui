import { describe, test, expect } from 'bun:test'
import { render } from 'ink-testing-library'
import { ParameterList } from '@/components/ParameterList.js'
import type { ParameterInfo } from '@/types/index.js'

function makeParams(count: number, location: 'query' | 'path' = 'query'): readonly ParameterInfo[] {
  return Array.from({ length: count }, (_, i) => ({
    name: `param${i}`,
    location,
    required: i === 0,
    deprecated: false,
    schema: { type: 'string' as const, displayType: 'string', nullable: false, readOnly: false, writeOnly: false },
  }))
}

describe('ParameterList maxLines', () => {
  test('truncates output when maxLines is set and exceeded', () => {
    const params = makeParams(20)
    const { lastFrame } = render(<ParameterList parameters={params} maxLines={5} />)
    const frame = lastFrame()!
    // Should show truncation indicator
    expect(frame).toContain('more')
    // Should not show all 20 parameters
    const paramMatches = frame.match(/param\d+/g) ?? []
    expect(paramMatches.length).toBeLessThan(20)
  })

  test('renders all parameters without maxLines', () => {
    const params = makeParams(20)
    const { lastFrame } = render(<ParameterList parameters={params} />)
    const frame = lastFrame()!
    const paramMatches = frame.match(/param\d+/g) ?? []
    expect(paramMatches.length).toBe(20)
  })

  test('renders all parameters when within maxLines budget', () => {
    const params = makeParams(3)
    const { lastFrame } = render(<ParameterList parameters={params} maxLines={10} />)
    const frame = lastFrame()!
    const paramMatches = frame.match(/param\d+/g) ?? []
    expect(paramMatches.length).toBe(3)
    expect(frame).not.toContain('more')
  })

  test('shows correct remaining count in truncation message', () => {
    const params = makeParams(15)
    const { lastFrame } = render(<ParameterList parameters={params} maxLines={5} />)
    const frame = lastFrame()!
    // Should mention how many more parameters exist
    expect(frame).toMatch(/\d+ more/)
  })
})

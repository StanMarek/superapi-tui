import { describe, it, expect } from 'bun:test'
import { render } from 'ink-testing-library'
import { SpecLoader } from '@/components/SpecLoader.js'

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
})

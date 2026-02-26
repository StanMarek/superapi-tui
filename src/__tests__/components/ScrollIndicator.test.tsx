import { describe, test, expect } from 'bun:test'
import { render } from 'ink-testing-library'
import { ScrollIndicator } from '@/components/ScrollIndicator.js'

describe('ScrollIndicator', () => {
  test('renders up indicator when visible', () => {
    const { lastFrame } = render(<ScrollIndicator direction="up" visible={true} />)
    expect(lastFrame()!).toContain('more above')
  })

  test('renders down indicator when visible', () => {
    const { lastFrame } = render(<ScrollIndicator direction="down" visible={true} />)
    expect(lastFrame()!).toContain('more below')
  })

  test('renders nothing when not visible', () => {
    const { lastFrame } = render(<ScrollIndicator direction="up" visible={false} />)
    expect(lastFrame()!).toBe('')
  })
})

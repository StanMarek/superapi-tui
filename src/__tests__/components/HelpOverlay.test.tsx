import { describe, it, expect } from 'bun:test'
import { render } from 'ink-testing-library'
import { HelpOverlay } from '@/components/index.js'

describe('HelpOverlay', () => {
  it('renders the header', () => {
    const { lastFrame } = render(<HelpOverlay />)
    expect(lastFrame()).toContain('Keyboard Shortcuts')
  })

  it('renders all section titles', () => {
    const { lastFrame } = render(<HelpOverlay />)
    expect(lastFrame()).toContain('Global')
    expect(lastFrame()).toContain('Navigation')
    expect(lastFrame()).toContain('Endpoint List')
    expect(lastFrame()).toContain('Endpoint Detail')
    expect(lastFrame()).toContain('Request Panel')
  })

  it('renders global keybindings', () => {
    const { lastFrame } = render(<HelpOverlay />)
    expect(lastFrame()).toContain('q / Ctrl+C')
    expect(lastFrame()).toContain('Quit')
    expect(lastFrame()).toContain('Tab')
    expect(lastFrame()).toContain('Next panel')
    expect(lastFrame()).toContain('Toggle fullscreen')
    expect(lastFrame()).toContain('Toggle help')
  })

  it('renders request panel keybindings', () => {
    const { lastFrame } = render(<HelpOverlay />)
    expect(lastFrame()).toContain('Send request')
    expect(lastFrame()).toContain('Switch server')
    expect(lastFrame()).toContain('Toggle auth config')
    expect(lastFrame()).toContain('Edit body')
    expect(lastFrame()).toContain('1 / 2 / 3')
  })

  it('renders dismiss hint', () => {
    const { lastFrame } = render(<HelpOverlay />)
    expect(lastFrame()).toContain('Press ? or Esc to dismiss')
  })
})

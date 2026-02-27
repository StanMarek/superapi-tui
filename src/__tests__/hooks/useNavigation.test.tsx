import { describe, it, expect } from 'bun:test'
import { render } from 'ink-testing-library'
import { Box, Text, useInput } from 'ink'
import { useNavigation } from '@/hooks/index.js'

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

function TestHarness() {
  const nav = useNavigation()
  return (
    <Box flexDirection="column">
      <Text>panel:{nav.focusedPanel}</Text>
      <Text>selected:{nav.selectedEndpoint?.id ?? 'none'}</Text>
      <Text>capture:{String(nav.textCapture)}</Text>
    </Box>
  )
}

function FullHarness() {
  const nav = useNavigation()
  return (
    <Box flexDirection="column">
      <Text>panel:{nav.focusedPanel}</Text>
      <Text>selected:{nav.selectedEndpoint?.id ?? 'none'}</Text>
      <Text>capture:{String(nav.textCapture)}</Text>
      <Text>fullscreen:{String(nav.fullscreenPanel ?? 'none')}</Text>
      <Text>help:{String(nav.showHelp)}</Text>
    </Box>
  )
}

// Harness that toggles textCapture on '/' and off on Escape
function TextCaptureHarness() {
  const nav = useNavigation()

  useInput((input, key) => {
    if (input === '/') {
      nav.setTextCapture(true)
    }
    if (key.escape) {
      nav.setTextCapture(false)
    }
  })

  return (
    <Box flexDirection="column">
      <Text>panel:{nav.focusedPanel}</Text>
      <Text>capture:{String(nav.textCapture)}</Text>
      <Text>fullscreen:{String(nav.fullscreenPanel ?? 'none')}</Text>
      <Text>help:{String(nav.showHelp)}</Text>
    </Box>
  )
}

describe('useNavigation', () => {
  it('starts with endpoints panel focused and no selection', () => {
    const { lastFrame } = render(<TestHarness />)
    expect(lastFrame()).toContain('panel:endpoints')
    expect(lastFrame()).toContain('selected:none')
    expect(lastFrame()).toContain('capture:false')
  })

  it('cycles focus forward with Tab', async () => {
    const { lastFrame, stdin } = render(<TestHarness />)
    stdin.write('\t')
    await delay(50)
    expect(lastFrame()).toContain('panel:detail')
    stdin.write('\t')
    await delay(50)
    expect(lastFrame()).toContain('panel:request')
    stdin.write('\t')
    await delay(50)
    expect(lastFrame()).toContain('panel:endpoints')
  })

  it('cycles focus backward with Shift+Tab', async () => {
    const { lastFrame, stdin } = render(<TestHarness />)
    stdin.write('\x1b[Z') // Shift+Tab escape sequence
    await delay(50)
    expect(lastFrame()).toContain('panel:request')
    stdin.write('\x1b[Z')
    await delay(50)
    expect(lastFrame()).toContain('panel:detail')
  })

  it('q does not cycle panels (it exits instead)', async () => {
    const { lastFrame, stdin } = render(<TestHarness />)
    expect(lastFrame()).toContain('panel:endpoints')
    // q triggers exit() — the render tree tears down
    stdin.write('q')
    await delay(100)
    // After exit(), frame is empty (app has exited)
    const frame = lastFrame()
    expect(frame === '' || frame === '\n' || !frame.includes('panel:detail')).toBe(true)
  })

  it('suppresses q and Tab when textCapture is true', async () => {
    const { lastFrame, stdin } = render(<TextCaptureHarness />)
    expect(lastFrame()).toContain('capture:false')
    expect(lastFrame()).toContain('panel:endpoints')

    // Enter text capture mode
    stdin.write('/')
    await delay(50)
    expect(lastFrame()).toContain('capture:true')

    // q should NOT exit — panel should still be rendered
    stdin.write('q')
    await delay(50)
    expect(lastFrame()).toContain('panel:endpoints')
    expect(lastFrame()).toContain('capture:true')

    // Tab should NOT cycle panels
    stdin.write('\t')
    await delay(50)
    expect(lastFrame()).toContain('panel:endpoints')

    // Exit text capture mode
    stdin.write('\x1b') // Escape
    await delay(50)
    expect(lastFrame()).toContain('capture:false')

    // Tab should now cycle panels (proving app is still alive)
    stdin.write('\t')
    await delay(50)
    expect(lastFrame()).toContain('panel:detail')
  })

  describe('fullscreen', () => {
    it('starts with no fullscreen', () => {
      const { lastFrame } = render(<FullHarness />)
      expect(lastFrame()).toContain('fullscreen:none')
    })

    it('f toggles fullscreen for focused panel', async () => {
      const { lastFrame, stdin } = render(<FullHarness />)
      expect(lastFrame()).toContain('panel:endpoints')

      stdin.write('f')
      await delay(50)
      expect(lastFrame()).toContain('fullscreen:endpoints')
    })

    it('f again exits fullscreen', async () => {
      const { lastFrame, stdin } = render(<FullHarness />)

      stdin.write('f')
      await delay(50)
      expect(lastFrame()).toContain('fullscreen:endpoints')

      stdin.write('f')
      await delay(50)
      expect(lastFrame()).toContain('fullscreen:none')
    })

    it('Esc exits fullscreen without changing focus', async () => {
      const { lastFrame, stdin } = render(<FullHarness />)

      stdin.write('f')
      await delay(50)
      expect(lastFrame()).toContain('fullscreen:endpoints')
      expect(lastFrame()).toContain('panel:endpoints')

      stdin.write('\x1b') // Escape
      await delay(50)
      expect(lastFrame()).toContain('fullscreen:none')
      expect(lastFrame()).toContain('panel:endpoints')
    })

    it('Tab exits fullscreen and cycles panel', async () => {
      const { lastFrame, stdin } = render(<FullHarness />)

      stdin.write('f')
      await delay(50)
      expect(lastFrame()).toContain('fullscreen:endpoints')

      stdin.write('\t')
      await delay(50)
      expect(lastFrame()).toContain('fullscreen:none')
      expect(lastFrame()).toContain('panel:detail')
    })

    it('Shift+Tab exits fullscreen and cycles panel backward', async () => {
      const { lastFrame, stdin } = render(<FullHarness />)

      stdin.write('\t')
      await delay(50)
      expect(lastFrame()).toContain('panel:detail')

      stdin.write('f')
      await delay(50)
      expect(lastFrame()).toContain('fullscreen:detail')

      stdin.write('\x1b[Z') // Shift+Tab
      await delay(50)
      expect(lastFrame()).toContain('fullscreen:none')
      expect(lastFrame()).toContain('panel:endpoints')
    })

    it('f is suppressed during textCapture', async () => {
      const { lastFrame, stdin } = render(<TextCaptureHarness />)

      stdin.write('/')
      await delay(50)
      expect(lastFrame()).toContain('capture:true')

      stdin.write('f')
      await delay(50)
      expect(lastFrame()).toContain('fullscreen:none')

      // Exit text capture, then f should work
      stdin.write('\x1b') // Escape
      await delay(50)
      stdin.write('f')
      await delay(50)
      expect(lastFrame()).toContain('fullscreen:endpoints')
    })
  })

  describe('help overlay', () => {
    it('starts with help hidden', () => {
      const { lastFrame } = render(<FullHarness />)
      expect(lastFrame()).toContain('help:false')
    })

    it('? toggles help overlay on', async () => {
      const { lastFrame, stdin } = render(<FullHarness />)

      stdin.write('?')
      await delay(50)
      expect(lastFrame()).toContain('help:true')
    })

    it('? dismisses help when visible', async () => {
      const { lastFrame, stdin } = render(<FullHarness />)

      stdin.write('?')
      await delay(50)
      expect(lastFrame()).toContain('help:true')

      stdin.write('?')
      await delay(50)
      expect(lastFrame()).toContain('help:false')
    })

    it('Esc dismisses help', async () => {
      const { lastFrame, stdin } = render(<FullHarness />)

      stdin.write('?')
      await delay(50)
      expect(lastFrame()).toContain('help:true')

      stdin.write('\x1b') // Escape
      await delay(50)
      expect(lastFrame()).toContain('help:false')
    })

    it('q, Tab, and f are suppressed while help is visible', async () => {
      const { lastFrame, stdin } = render(<FullHarness />)

      stdin.write('?')
      await delay(50)
      expect(lastFrame()).toContain('help:true')

      // q should NOT exit
      stdin.write('q')
      await delay(50)
      expect(lastFrame()).toContain('help:true')

      // Tab should NOT cycle panels
      stdin.write('\t')
      await delay(50)
      expect(lastFrame()).toContain('panel:endpoints')

      // f should NOT toggle fullscreen
      stdin.write('f')
      await delay(50)
      expect(lastFrame()).toContain('fullscreen:none')

      // ? should dismiss
      stdin.write('?')
      await delay(50)
      expect(lastFrame()).toContain('help:false')

      // Now Tab should work
      stdin.write('\t')
      await delay(50)
      expect(lastFrame()).toContain('panel:detail')
    })

    it('? is suppressed during textCapture', async () => {
      const { lastFrame, stdin } = render(<TextCaptureHarness />)

      stdin.write('/')
      await delay(50)
      expect(lastFrame()).toContain('capture:true')

      stdin.write('?')
      await delay(50)
      expect(lastFrame()).toContain('help:false')

      // Exit text capture, then ? should work
      stdin.write('\x1b') // Escape
      await delay(50)
      stdin.write('?')
      await delay(50)
      expect(lastFrame()).toContain('help:true')
    })

    it('help during fullscreen: closing help preserves fullscreen', async () => {
      const { lastFrame, stdin } = render(<FullHarness />)

      // Enter fullscreen
      stdin.write('f')
      await delay(50)
      expect(lastFrame()).toContain('fullscreen:endpoints')

      // Open help
      stdin.write('?')
      await delay(50)
      expect(lastFrame()).toContain('help:true')

      // Close help
      stdin.write('?')
      await delay(50)
      expect(lastFrame()).toContain('help:false')
      expect(lastFrame()).toContain('fullscreen:endpoints')
    })
  })
})

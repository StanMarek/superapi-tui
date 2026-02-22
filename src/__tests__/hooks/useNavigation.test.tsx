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
    // If q were treated as normal input, panel would stay the same
    // (q is not a navigation key). After exit(), Tab no longer cycles.
    stdin.write('q')
    await delay(50)
    // App called exit() — subsequent Tab has no effect
    stdin.write('\t')
    await delay(50)
    expect(lastFrame()).toContain('panel:endpoints')
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
})

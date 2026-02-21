import { describe, it, expect } from 'bun:test'
import { render } from 'ink-testing-library'
import { Box, Text } from 'ink'
import { useNavigation } from '@/hooks/index.js'

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

function TestHarness() {
  const nav = useNavigation()
  return (
    <Box flexDirection="column">
      <Text>panel:{nav.focusedPanel}</Text>
      <Text>selected:{nav.selectedEndpoint?.id ?? 'none'}</Text>
    </Box>
  )
}

describe('useNavigation', () => {
  it('starts with endpoints panel focused and no selection', () => {
    const { lastFrame } = render(<TestHarness />)
    expect(lastFrame()).toContain('panel:endpoints')
    expect(lastFrame()).toContain('selected:none')
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
})

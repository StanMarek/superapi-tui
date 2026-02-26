import { describe, test, expect } from 'bun:test'
import { render } from 'ink-testing-library'
import { Text } from 'ink'
import { useTerminalHeight } from '@/hooks/useTerminalHeight.js'

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

function Harness({ override }: { readonly override?: number }) {
  const height = useTerminalHeight(override)
  return <Text>height:{height}</Text>
}

describe('useTerminalHeight', () => {
  test('returns override when provided', async () => {
    const { lastFrame } = render(<Harness override={30} />)
    await delay(50)
    expect(lastFrame()!).toContain('height:30')
  })

  test('returns default 24 when stdout.rows is undefined (ink-testing-library)', async () => {
    const { lastFrame } = render(<Harness />)
    await delay(50)
    expect(lastFrame()!).toContain('height:24')
  })

  test('override takes precedence over stdout', async () => {
    const { lastFrame } = render(<Harness override={10} />)
    await delay(50)
    expect(lastFrame()!).toContain('height:10')
  })
})

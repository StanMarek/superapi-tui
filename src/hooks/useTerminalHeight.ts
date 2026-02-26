import { useState, useEffect } from 'react'
import { useStdout } from 'ink'

const DEFAULT_TERMINAL_HEIGHT = 24
const MIN_TERMINAL_HEIGHT = 1

export function useTerminalHeight(override?: number): number {
  const { stdout } = useStdout()
  const [height, setHeight] = useState<number>(
    override !== undefined
      ? Math.max(MIN_TERMINAL_HEIGHT, override)
      : Math.max(MIN_TERMINAL_HEIGHT, stdout.rows ?? DEFAULT_TERMINAL_HEIGHT),
  )

  useEffect(() => {
    if (override !== undefined) {
      setHeight(Math.max(MIN_TERMINAL_HEIGHT, override))
      return
    }

    const update = () => {
      setHeight(Math.max(MIN_TERMINAL_HEIGHT, stdout.rows ?? DEFAULT_TERMINAL_HEIGHT))
    }

    stdout.on('resize', update)
    return () => {
      stdout.off('resize', update)
    }
  }, [stdout, override])

  return height
}

import { useState, useEffect } from 'react'
import { useStdout } from 'ink'

const DEFAULT_TERMINAL_HEIGHT = 24

export function useTerminalHeight(override?: number): number {
  const { stdout } = useStdout()
  const [height, setHeight] = useState<number>(
    override ?? stdout.rows ?? DEFAULT_TERMINAL_HEIGHT,
  )

  useEffect(() => {
    if (override !== undefined) {
      setHeight(override)
      return
    }

    const update = () => {
      setHeight(stdout.rows ?? DEFAULT_TERMINAL_HEIGHT)
    }

    stdout.on('resize', update)
    return () => {
      stdout.off('resize', update)
    }
  }, [stdout, override])

  return height
}

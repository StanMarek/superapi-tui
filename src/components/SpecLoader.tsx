import { useState, useEffect, useCallback } from 'react'
import { Box, Text, useApp } from 'ink'
import { Spinner } from '@inkjs/ui'
import { loadSpec } from '@/loader/index.js'
import { parseSpec } from '@/parser/index.js'
import { Launcher } from './Launcher.js'
import App from '@/App.js'
import type { ParsedSpec } from '@/types/index.js'

interface Props {
  readonly input: string | undefined
}

type State =
  | { readonly phase: 'launcher' }
  | { readonly phase: 'loading'; readonly message: string; readonly specInput: string }
  | { readonly phase: 'loaded'; readonly spec: ParsedSpec }
  | { readonly phase: 'error'; readonly message: string }

export function SpecLoader({ input }: Props) {
  const { exit } = useApp()
  const [state, setState] = useState<State>(
    input
      ? { phase: 'loading', message: `Loading spec from ${input}...`, specInput: input }
      : { phase: 'launcher' },
  )

  // Derived value: non-null only when we're in loading phase, stable across message updates
  const specInputForLoad = state.phase === 'loading' ? state.specInput : null

  useEffect(() => {
    if (!specInputForLoad) return
    const target = specInputForLoad

    let cancelled = false

    async function load() {
      try {
        const result = await loadSpec(target)
        if (cancelled) return

        setState({ phase: 'loading', message: 'Parsing spec...', specInput: target })
        const spec = await parseSpec(result.content)
        if (cancelled) return

        setState({ phase: 'loaded', spec })
      } catch (error) {
        if (cancelled) return
        const message = error instanceof Error ? error.message : String(error)
        if (error instanceof Error && error.cause) {
          console.error(error)
        }
        setState({ phase: 'error', message })
      }
    }

    load()
    return () => {
      cancelled = true
    }
  }, [specInputForLoad])

  // Exit after showing error for a moment
  useEffect(() => {
    if (state.phase !== 'error') return
    const timer = setTimeout(() => {
      console.error(`Error: ${state.message}`)
      process.exitCode = 1
      exit()
    }, 2000)
    return () => clearTimeout(timer)
  }, [state, exit])

  const handleLauncherSelect = useCallback((value: string) => {
    setState({ phase: 'loading', message: `Loading spec from ${value}...`, specInput: value })
  }, [])

  if (state.phase === 'launcher') {
    return <Launcher onSelect={handleLauncherSelect} />
  }

  if (state.phase === 'loading') {
    return (
      <Box padding={1}>
        <Spinner label={state.message} />
      </Box>
    )
  }

  if (state.phase === 'error') {
    return (
      <Box flexDirection="column" padding={1}>
        <Text color="red" bold>
          Error:{' '}
        </Text>
        <Text color="red">{state.message}</Text>
      </Box>
    )
  }

  return <App spec={state.spec} />
}

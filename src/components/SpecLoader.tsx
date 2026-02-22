import { useState, useEffect } from 'react'
import { Box, Text, useApp } from 'ink'
import { Spinner } from '@inkjs/ui'
import { loadSpec } from '@/loader/index.js'
import { parseSpec } from '@/parser/index.js'
import App from '@/App.js'
import type { ParsedSpec } from '@/types/index.js'

interface Props {
  readonly input: string | undefined
}

type State =
  | { readonly phase: 'no-input' }
  | { readonly phase: 'loading'; readonly message: string }
  | { readonly phase: 'loaded'; readonly spec: ParsedSpec }
  | { readonly phase: 'error'; readonly message: string }

export function SpecLoader({ input }: Props) {
  const { exit } = useApp()
  const [state, setState] = useState<State>(
    input ? { phase: 'loading', message: `Loading spec from ${input}...` } : { phase: 'no-input' },
  )

  useEffect(() => {
    if (!input) return
    const specInput = input

    let cancelled = false

    async function load() {
      try {
        setState({ phase: 'loading', message: `Loading spec from ${specInput}...` })
        const result = await loadSpec(specInput)
        if (cancelled) return

        setState({ phase: 'loading', message: 'Parsing spec...' })
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
  }, [input])

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

  // Exit after rendering usage screen
  useEffect(() => {
    if (state.phase !== 'no-input') return
    const timer = setTimeout(() => {
      exit()
    }, 100)
    return () => clearTimeout(timer)
  }, [state.phase, exit])

  if (state.phase === 'no-input') {
    return (
      <Box flexDirection="column" padding={1}>
        <Text bold color="cyan">
          superapi-tui
        </Text>
        <Text dimColor>OpenAPI v3.0/v3.1 Terminal Browser</Text>
        <Box marginTop={1}>
          <Text>Usage: superapi-tui {'<'}file-or-url{'>'}</Text>
        </Box>
        <Box marginTop={1} flexDirection="column">
          <Text dimColor>  superapi-tui ./openapi.yaml</Text>
          <Text dimColor>  superapi-tui https://example.com/v3/api-docs</Text>
          <Text dimColor>  superapi-tui https://example.com/swagger-ui/index.html</Text>
        </Box>
      </Box>
    )
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

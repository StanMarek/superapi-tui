import { useState, useEffect } from 'react'
import { Box, Text } from 'ink'
import { Spinner } from '@inkjs/ui'
import { loadSpec } from '@/loader/index.js'
import { parseSpec } from '@/parser/index.js'
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
  const [state, setState] = useState<State>(
    input ? { phase: 'loading', message: `Loading spec from ${input}...` } : { phase: 'no-input' },
  )

  useEffect(() => {
    if (!input) return

    let cancelled = false

    async function load() {
      try {
        setState({ phase: 'loading', message: `Loading spec from ${input}...` })
        const result = await loadSpec(input!)
        if (cancelled) return

        setState({ phase: 'loading', message: 'Parsing spec...' })
        const spec = await parseSpec(result.content)
        if (cancelled) return

        setState({ phase: 'loaded', spec })
      } catch (error) {
        if (cancelled) return
        const message = error instanceof Error ? error.message : String(error)
        setState({ phase: 'error', message })
      }
    }

    load()
    return () => {
      cancelled = true
    }
  }, [input])

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

  // Loaded state — App component will be wired in Task 7
  return (
    <Box flexDirection="column" padding={1}>
      <Text bold color="green">
        Spec loaded: {state.spec.info.title}
      </Text>
      <Text dimColor>
        v{state.spec.info.version} — {state.spec.endpoints.length} endpoints
      </Text>
    </Box>
  )
}

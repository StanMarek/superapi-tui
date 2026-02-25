import { useState, useEffect, useCallback } from 'react'
import { Box, Text, useApp } from 'ink'
import { Spinner } from '@inkjs/ui'
import { loadSpec as defaultLoadSpec } from '@/loader/index.js'
import { parseSpec as defaultParseSpec } from '@/parser/index.js'
import { Launcher } from './Launcher.js'
import type { LauncherDeps } from './Launcher.js'
import App from '@/App.js'
import type { ParsedSpec, LoadResult } from '@/types/index.js'

export interface SpecLoaderDeps {
  readonly loadSpec: (input: string) => Promise<LoadResult>
  readonly parseSpec: (content: string) => Promise<ParsedSpec>
}

interface Props {
  readonly input: string | undefined
  readonly deps?: SpecLoaderDeps
  readonly launcherDeps?: LauncherDeps
}

type State =
  | { readonly phase: 'launcher' }
  | { readonly phase: 'loading'; readonly message: string; readonly specInput: string; readonly savedRequestBaseUrl?: string }
  | { readonly phase: 'loaded'; readonly spec: ParsedSpec; readonly specLoadUrl: string; readonly savedRequestBaseUrl?: string }
  | { readonly phase: 'error'; readonly message: string }

export function SpecLoader({ input, deps, launcherDeps }: Props) {
  const resolvedLoadSpec = deps?.loadSpec ?? defaultLoadSpec
  const resolvedParseSpec = deps?.parseSpec ?? defaultParseSpec
  const { exit } = useApp()
  const [state, setState] = useState<State>(
    input
      ? { phase: 'loading', message: `Loading spec from ${input}...`, specInput: input }
      : { phase: 'launcher' },
  )

  // Derived value: non-null only when we're in loading phase, stable across message updates
  const specInputForLoad = state.phase === 'loading' ? state.specInput : null
  const savedRequestBaseUrlForLoad = state.phase === 'loading' ? state.savedRequestBaseUrl : undefined

  useEffect(() => {
    if (!specInputForLoad) return
    const target = specInputForLoad

    let cancelled = false

    async function load() {
      try {
        const result = await resolvedLoadSpec(target)
        if (cancelled) return

        setState({ phase: 'loading', message: 'Parsing spec...', specInput: target })
        const spec = await resolvedParseSpec(result.content)
        if (cancelled) return

        setState({ phase: 'loaded', spec, specLoadUrl: target, savedRequestBaseUrl: savedRequestBaseUrlForLoad })
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

  const handleLauncherSelect = useCallback((value: string, savedRequestBaseUrl?: string) => {
    setState({ phase: 'loading', message: `Loading spec from ${value}...`, specInput: value, savedRequestBaseUrl })
  }, [])

  if (state.phase === 'launcher') {
    return <Launcher onSelect={handleLauncherSelect} deps={launcherDeps} />
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

  return <App spec={state.spec} specLoadUrl={state.specLoadUrl} savedRequestBaseUrl={state.savedRequestBaseUrl} />
}

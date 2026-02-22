import { useState, useCallback } from 'react'
import type { SchemaInfo } from '@/types/index.js'

export interface SchemaStackEntry {
  readonly schema: SchemaInfo
  readonly label: string
}

export interface SchemaNavigationState {
  readonly stack: readonly SchemaStackEntry[]
  readonly currentView: 'endpoint' | 'schema'
  readonly currentSchema: SchemaInfo | null
  readonly breadcrumbs: readonly string[]
  readonly push: (schema: SchemaInfo, label: string) => void
  readonly pop: () => void
  readonly reset: () => void
}

export function useSchemaNavigation(): SchemaNavigationState {
  const [stack, setStack] = useState<readonly SchemaStackEntry[]>([])

  const currentView = stack.length > 0 ? 'schema' : 'endpoint'
  const currentSchema = stack.length > 0 ? stack[stack.length - 1].schema : null
  const breadcrumbs = stack.map(entry => entry.label)

  const push = useCallback((schema: SchemaInfo, label: string) => {
    setStack(prev => [...prev, { schema, label }])
  }, [])

  const pop = useCallback(() => {
    setStack(prev => (prev.length > 0 ? prev.slice(0, -1) : prev))
  }, [])

  const reset = useCallback(() => {
    setStack([])
  }, [])

  return { stack, currentView, currentSchema, breadcrumbs, push, pop, reset }
}

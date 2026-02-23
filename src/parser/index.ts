import type { ParsedSpec } from '@/types/index.js'
import { SpecParseError } from '@/types/index.js'
import { validateSpec } from './validate.js'
import { dereferenceSpec } from './dereference.js'
import { transformSpec } from './transform.js'

export { validateSpec } from './validate.js'
export type { ValidationResult } from './validate.js'
export { dereferenceSpec } from './dereference.js'
export { transformSpec } from './transform.js'
export { transformSchema } from './transform-schema.js'

export async function parseSpec(content: string): Promise<ParsedSpec> {
  const { warnings } = await validateSpec(content)
  if (warnings.length > 0) {
    console.warn(`superapi-tui: spec has validation issues (continuing anyway):\n  - ${warnings.join('\n  - ')}`)
  }
  const doc = dereferenceSpec(content)
  try {
    return transformSpec(doc)
  } catch (error) {
    if (error instanceof SpecParseError) throw error
    throw new SpecParseError(
      `Failed to transform spec${error instanceof Error ? `: ${error.message}` : ''}`,
      [],
      error,
    )
  }
}

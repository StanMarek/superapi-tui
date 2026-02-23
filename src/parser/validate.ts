import { validate } from '@scalar/openapi-parser'
import { SpecParseError } from '@/types/index.js'
import { parseYamlOrJson } from '@/utils/index.js'

export interface ValidationResult {
  readonly warnings: readonly string[]
}

export async function validateSpec(content: string): Promise<ValidationResult> {
  try {
    const doc = parseYamlOrJson(content)
    const result = await validate(doc)
    if (!result.valid) {
      const warnings = result.errors?.map((e) => e.message ?? String(e)) ?? []
      return { warnings }
    }
    return { warnings: [] }
  } catch (error) {
    if (error instanceof SpecParseError) throw error
    throw new SpecParseError(
      `Failed to validate spec${error instanceof Error ? `: ${error.message}` : ''}`,
      [],
      error,
    )
  }
}

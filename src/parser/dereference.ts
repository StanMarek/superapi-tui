import { dereference } from '@scalar/openapi-parser'
import { SpecParseError } from '@/types/index.js'
import { parseYamlOrJson } from '@/utils/index.js'

export function dereferenceSpec(content: string): Record<string, unknown> {
  try {
    const doc = parseYamlOrJson(content)
    const result = dereference(doc)
    if (!result.schema) {
      throw new SpecParseError('Failed to dereference spec: no schema returned')
    }
    return result.schema as Record<string, unknown>
  } catch (error) {
    if (error instanceof SpecParseError) throw error
    throw new SpecParseError('Failed to dereference spec', [], error)
  }
}

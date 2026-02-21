import { validate } from '@scalar/openapi-parser'
import { SpecParseError } from '@/types/index.js'
import { parseYamlOrJson } from '@/utils/index.js'

export async function validateSpec(content: string): Promise<void> {
  try {
    const doc = parseYamlOrJson(content)
    const result = await validate(doc)
    if (!result.valid) {
      const errors = result.errors?.map((e) => e.message ?? String(e)) ?? []
      throw new SpecParseError('Invalid OpenAPI spec', errors)
    }
  } catch (error) {
    if (error instanceof SpecParseError) throw error
    throw new SpecParseError('Failed to validate spec', [], error)
  }
}

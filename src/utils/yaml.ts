import YAML from 'yaml'

export function parseYamlOrJson(content: string): Record<string, unknown> {
  const trimmed = content.trim()
  if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
    try {
      const parsed = JSON.parse(trimmed)
      if (Array.isArray(parsed)) {
        throw new Error('Content is a JSON array, expected an object')
      }
      return parsed
    } catch (jsonError) {
      throw new Error(
        `Failed to parse JSON: ${jsonError instanceof Error ? jsonError.message : String(jsonError)}`,
        { cause: jsonError },
      )
    }
  }
  const result = YAML.parse(trimmed)
  if (result === null || typeof result !== 'object') {
    throw new Error('Content is not a valid JSON or YAML object')
  }
  return result
}

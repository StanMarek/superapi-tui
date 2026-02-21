import YAML from 'yaml'

export function parseYamlOrJson(content: string): Record<string, unknown> {
  const trimmed = content.trim()
  if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
    try {
      return JSON.parse(trimmed)
    } catch {
      // Fall through to YAML
    }
  }
  const result = YAML.parse(trimmed)
  if (result === null || typeof result !== 'object') {
    throw new Error('Content is not a valid JSON or YAML object')
  }
  return result
}

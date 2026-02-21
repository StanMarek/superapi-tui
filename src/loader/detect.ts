import type { InputType, SpecFormat } from '@/types/index.js'
import { isUrl } from '@/utils/index.js'

export function detectInputType(input: string): InputType {
  return isUrl(input) ? 'url' : 'file'
}

export function detectSpecFormat(content: string): SpecFormat {
  const trimmed = content.trim()
  if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
    try {
      JSON.parse(trimmed)
      return 'json'
    } catch {
      // Fall through
    }
  }
  return 'yaml'
}

import type { LoadResult } from '@/types/index.js'
import { SpecLoadError } from '@/types/index.js'
import { detectSpecFormat } from './detect.js'

export async function loadFromUrl(url: string): Promise<LoadResult> {
  const parsed = new URL(url)
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    throw new SpecLoadError(`Unsupported protocol: ${parsed.protocol}`)
  }
  try {
    const response = await fetch(url)
    if (!response.ok) {
      throw new SpecLoadError(`HTTP ${response.status} (${response.statusText}) fetching ${url}`)
    }
    const content = await response.text()
    return {
      content,
      format: detectSpecFormat(content),
      inputType: 'url',
      source: url,
    }
  } catch (error) {
    if (error instanceof SpecLoadError) throw error
    throw new SpecLoadError(`Failed to fetch ${url}`, error)
  }
}

import type { LoadResult } from '@/types/index.js'
import { SpecLoadError } from '@/types/index.js'
import { detectSpecFormat } from './detect.js'

export async function loadFromFile(filePath: string): Promise<LoadResult> {
  try {
    const file = Bun.file(filePath)
    const exists = await file.exists()
    if (!exists) {
      throw new SpecLoadError(`File not found: ${filePath}`)
    }
    const content = await file.text()
    return {
      content,
      format: detectSpecFormat(content),
      inputType: 'file',
      source: filePath,
    }
  } catch (error) {
    if (error instanceof SpecLoadError) throw error
    throw new SpecLoadError(`Failed to read file: ${filePath}`, error)
  }
}

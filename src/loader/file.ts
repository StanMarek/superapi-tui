import { readFile, access } from 'node:fs/promises'
import type { LoadResult } from '@/types/index.js'
import { SpecLoadError } from '@/types/index.js'
import { detectSpecFormat } from './detect.js'

export async function loadFromFile(filePath: string): Promise<LoadResult> {
  try {
    try {
      await access(filePath)
    } catch {
      throw new SpecLoadError(`File not found: ${filePath}`)
    }
    const content = await readFile(filePath, 'utf-8')
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

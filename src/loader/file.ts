import { readFile } from 'node:fs/promises'
import type { LoadResult } from '@/types/index.js'
import { SpecLoadError } from '@/types/index.js'
import { detectSpecFormat } from './detect.js'

export async function loadFromFile(filePath: string): Promise<LoadResult> {
  try {
    const content = await readFile(filePath, 'utf-8')
    return {
      content,
      format: detectSpecFormat(content),
      inputType: 'file',
      source: filePath,
    }
  } catch (error) {
    const code = error instanceof Error && 'code' in error
      ? (error as NodeJS.ErrnoException).code
      : undefined
    if (code === 'ENOENT') {
      throw new SpecLoadError(`File not found: ${filePath}`, error)
    }
    throw new SpecLoadError(`Cannot access file: ${filePath}`, error)
  }
}

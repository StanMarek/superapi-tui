import type { LoadResult } from '@/types/index.js'
import { SpecLoadError } from '@/types/index.js'
import { detectInputType } from './detect.js'
import { loadFromFile } from './file.js'
import { loadFromUrl } from './url.js'
import { isSwaggerUiPage, extractSpecUrl } from './swagger-ui.js'

export { detectInputType, detectSpecFormat } from './detect.js'
export { loadFromFile } from './file.js'
export { loadFromUrl } from './url.js'
export { isSwaggerUiPage, extractSpecUrl } from './swagger-ui.js'

export async function loadSpec(input: string): Promise<LoadResult> {
  const inputType = detectInputType(input)

  if (inputType === 'file') {
    return loadFromFile(input)
  }

  // URL path: fetch first, check if Swagger UI
  const initial = await loadFromUrl(input)

  if (isSwaggerUiPage(initial.content)) {
    const specUrl = extractSpecUrl(initial.content, input)
    if (!specUrl) {
      throw new SpecLoadError(`Detected Swagger UI page at ${input} but could not extract spec URL`)
    }
    const result = await loadFromUrl(specUrl)
    return { ...result, resolvedUrl: specUrl }
  }

  return initial
}

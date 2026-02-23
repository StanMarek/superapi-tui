import type { LoadResult } from '@/types/index.js'
import { SpecLoadError } from '@/types/index.js'
import { detectInputType } from './detect.js'
import { loadFromFile } from './file.js'
import { loadFromUrl } from './url.js'
import {
  isSwaggerUiPage,
  extractSpecUrl,
  extractConfigUrl,
  extractExternalScriptUrls,
  isSameOrigin,
  parseSwaggerConfig,
  resolveSpecUrlFromConfig,
} from './swagger-ui.js'

export { detectInputType, detectSpecFormat } from './detect.js'
export { loadFromFile } from './file.js'
export { loadFromUrl } from './url.js'
export {
  isSwaggerUiPage,
  extractSpecUrl,
  extractConfigUrl,
  extractExternalScriptUrls,
  isSameOrigin,
  parseSwaggerConfig,
  resolveSpecUrlFromConfig,
} from './swagger-ui.js'

async function fetchConfigSpecUrl(configUrl: string): Promise<string | null> {
  try {
    const configResult = await loadFromUrl(configUrl)
    const config = parseSwaggerConfig(configResult.content, configUrl)
    return resolveSpecUrlFromConfig(config)
  } catch {
    return null
  }
}

async function resolveSwaggerUiSpec(html: string, pageUrl: string): Promise<string | null> {
  // 1. Inline URL in HTML (fastest, no extra requests)
  const inlineUrl = extractSpecUrl(html, pageUrl)
  if (inlineUrl) return inlineUrl

  // 2. Inline configUrl in HTML
  const inlineConfigUrl = extractConfigUrl(html, pageUrl)
  if (inlineConfigUrl) {
    const specUrl = await fetchConfigSpecUrl(inlineConfigUrl)
    if (specUrl) return specUrl
  }

  // 3. External same-origin scripts
  const scriptUrls = extractExternalScriptUrls(html, pageUrl)
  const sameOriginScripts = scriptUrls.filter((url) => isSameOrigin(url, pageUrl))

  for (const scriptUrl of sameOriginScripts) {
    try {
      const scriptResult = await loadFromUrl(scriptUrl)

      // 3a. configUrl in external script (before url — avoids petstore default trap)
      const scriptConfigUrl = extractConfigUrl(scriptResult.content, pageUrl)
      if (scriptConfigUrl) {
        const specUrl = await fetchConfigSpecUrl(scriptConfigUrl)
        if (specUrl) return specUrl
      }

      // 3b. Direct URL in external script
      const scriptSpecUrl = extractSpecUrl(scriptResult.content, pageUrl)
      if (scriptSpecUrl) return scriptSpecUrl
    } catch {
      // Script fetch failed — continue to next
    }
  }

  return null
}

export async function loadSpec(input: string): Promise<LoadResult> {
  const inputType = detectInputType(input)

  if (inputType === 'file') {
    return loadFromFile(input)
  }

  // URL path: fetch first, check if Swagger UI
  const initial = await loadFromUrl(input)

  if (isSwaggerUiPage(initial.content)) {
    const specUrl = await resolveSwaggerUiSpec(initial.content, input)
    if (!specUrl) {
      throw new SpecLoadError(`Detected Swagger UI page at ${input} but could not extract spec URL`)
    }
    const result = await loadFromUrl(specUrl)
    return { ...result, resolvedUrl: specUrl }
  }

  return initial
}

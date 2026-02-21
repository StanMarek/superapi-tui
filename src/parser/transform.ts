import type {
  Endpoint,
  ParsedSpec,
  SecurityRequirement,
  SecuritySchemeInfo,
  ServerInfo,
  ServerVariable,
  SpecInfo,
  TagGroup,
  SchemaInfo,
} from '@/types/index.js'
import { isHttpMethod, METHOD_SORT_ORDER } from '@/utils/index.js'
import { transformEndpoint } from './transform-endpoint.js'
import { transformSchema } from './transform-schema.js'

type RawDoc = Record<string, unknown>

function extractInfo(doc: RawDoc): SpecInfo {
  const info = (doc.info as Record<string, unknown>) ?? {}
  const contact = info.contact as Record<string, unknown> | undefined
  const license = info.license as Record<string, unknown> | undefined

  return {
    title: String(info.title ?? 'Untitled'),
    version: String(info.version ?? '0.0.0'),
    description: typeof info.description === 'string' ? info.description : undefined,
    termsOfService: typeof info.termsOfService === 'string' ? info.termsOfService : undefined,
    contact: contact
      ? {
          name: typeof contact.name === 'string' ? contact.name : undefined,
          url: typeof contact.url === 'string' ? contact.url : undefined,
          email: typeof contact.email === 'string' ? contact.email : undefined,
        }
      : undefined,
    license: license
      ? {
          name: String(license.name ?? ''),
          url: typeof license.url === 'string' ? license.url : undefined,
        }
      : undefined,
    specVersion: String(doc.openapi ?? ''),
  }
}

function extractServers(doc: RawDoc): readonly ServerInfo[] {
  const servers = doc.servers as Record<string, unknown>[] | undefined
  if (!Array.isArray(servers)) return []

  return servers.map((server) => {
    const variables = new Map<string, ServerVariable>()
    const rawVars = server.variables as Record<string, Record<string, unknown>> | undefined
    if (rawVars && typeof rawVars === 'object') {
      for (const [name, variable] of Object.entries(rawVars)) {
        variables.set(name, {
          defaultValue: String(variable.default ?? ''),
          enumValues: Array.isArray(variable.enum) ? variable.enum.map(String) : undefined,
          description: typeof variable.description === 'string' ? variable.description : undefined,
        })
      }
    }

    return {
      url: String(server.url ?? ''),
      description: typeof server.description === 'string' ? server.description : undefined,
      variables,
    }
  })
}

function extractSecuritySchemes(doc: RawDoc): readonly SecuritySchemeInfo[] {
  const components = doc.components as Record<string, unknown> | undefined
  const schemes = components?.securitySchemes as Record<string, Record<string, unknown>> | undefined
  if (!schemes || typeof schemes !== 'object') return []

  return Object.entries(schemes).map(([name, scheme]) => ({
    name,
    type: String(scheme.type ?? '') as SecuritySchemeInfo['type'],
    scheme: typeof scheme.scheme === 'string' ? scheme.scheme : undefined,
    in: scheme.in as SecuritySchemeInfo['in'],
    paramName: typeof scheme.name === 'string' ? scheme.name : undefined,
    description: typeof scheme.description === 'string' ? scheme.description : undefined,
    bearerFormat: typeof scheme.bearerFormat === 'string' ? scheme.bearerFormat : undefined,
  }))
}

function extractGlobalSecurity(doc: RawDoc): readonly SecurityRequirement[] {
  const security = doc.security as Record<string, unknown>[] | undefined
  if (!Array.isArray(security)) return []

  return security.flatMap((entry) => {
    if (!entry || typeof entry !== 'object') return []
    return Object.entries(entry).map(([name, scopes]) => ({
      name,
      scopes: Array.isArray(scopes) ? scopes.map(String) : [],
    }))
  })
}

function extractComponentSchemas(doc: RawDoc): ReadonlyMap<string, SchemaInfo> {
  const components = doc.components as Record<string, unknown> | undefined
  const schemas = components?.schemas as Record<string, Record<string, unknown>> | undefined
  if (!schemas || typeof schemas !== 'object') return new Map()

  const result = new Map<string, SchemaInfo>()
  for (const [name, schema] of Object.entries(schemas)) {
    if (schema && typeof schema === 'object') {
      result.set(name, transformSchema(schema, name))
    }
  }
  return result
}

function extractEndpoints(doc: RawDoc): readonly Endpoint[] {
  const paths = doc.paths as Record<string, Record<string, unknown>> | undefined
  if (!paths || typeof paths !== 'object') return []

  const endpoints: Endpoint[] = []

  for (const [path, pathItem] of Object.entries(paths)) {
    if (!pathItem || typeof pathItem !== 'object') continue

    const pathParams = pathItem.parameters as Record<string, unknown>[] | undefined

    for (const [method, operation] of Object.entries(pathItem)) {
      if (!isHttpMethod(method)) continue
      if (!operation || typeof operation !== 'object') continue

      endpoints.push(
        transformEndpoint(path, method, operation as Record<string, unknown>, pathParams),
      )
    }
  }

  // Sort by path, then by method order
  endpoints.sort((a, b) => {
    const pathCmp = a.path.localeCompare(b.path)
    if (pathCmp !== 0) return pathCmp
    return (METHOD_SORT_ORDER[a.method] ?? 99) - (METHOD_SORT_ORDER[b.method] ?? 99)
  })

  return endpoints
}

function groupByTags(
  endpoints: readonly Endpoint[],
  specTags: Record<string, unknown>[] | undefined,
): { tagGroups: readonly TagGroup[]; tags: readonly string[] } {
  // Build tag metadata from spec-defined tags
  const tagMeta = new Map<string, string | undefined>()
  const tagOrder: string[] = []

  if (Array.isArray(specTags)) {
    for (const tag of specTags) {
      if (tag && typeof tag === 'object') {
        const name = String((tag as Record<string, unknown>).name ?? '')
        tagMeta.set(
          name,
          typeof (tag as Record<string, unknown>).description === 'string'
            ? ((tag as Record<string, unknown>).description as string)
            : undefined,
        )
        tagOrder.push(name)
      }
    }
  }

  // Group endpoints by their tags
  const groups = new Map<string, Endpoint[]>()
  for (const endpoint of endpoints) {
    const tags = endpoint.tags.length > 0 ? endpoint.tags : ['default']
    for (const tag of tags) {
      if (!groups.has(tag)) {
        groups.set(tag, [])
      }
      groups.get(tag)!.push(endpoint)
    }
  }

  // Build ordered tag groups: spec-defined tags first, then any extra
  const allTags = new Set<string>([...tagOrder, ...groups.keys()])
  const tags = [...allTags].filter((t) => groups.has(t))

  const tagGroups: TagGroup[] = tags.map((name) => ({
    name,
    description: tagMeta.get(name),
    endpoints: groups.get(name) ?? [],
  }))

  return { tagGroups, tags }
}

export function transformSpec(doc: RawDoc): ParsedSpec {
  const info = extractInfo(doc)
  const servers = extractServers(doc)
  const securitySchemes = extractSecuritySchemes(doc)
  const globalSecurity = extractGlobalSecurity(doc)
  const componentSchemas = extractComponentSchemas(doc)
  const endpoints = extractEndpoints(doc)
  const { tagGroups, tags } = groupByTags(
    endpoints,
    doc.tags as Record<string, unknown>[] | undefined,
  )

  return {
    info,
    servers,
    tagGroups,
    endpoints,
    tags,
    securitySchemes,
    globalSecurity,
    componentSchemas,
  }
}

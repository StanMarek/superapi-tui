import type {
  Endpoint,
  HttpMethod,
  MediaTypeInfo,
  ParameterInfo,
  RequestBodyInfo,
  ResponseHeaderInfo,
  ResponseInfo,
  SecurityRequirement,
} from '@/types/index.js'
import { transformSchema } from './transform-schema.js'

type RawSchema = Record<string, unknown>
type RawOperation = Record<string, unknown>
type RawParam = Record<string, unknown>

function transformParameter(raw: RawParam): ParameterInfo {
  return {
    name: String(raw.name ?? ''),
    location: (raw.in as ParameterInfo['location']) ?? 'query',
    required: raw.required === true,
    description: typeof raw.description === 'string' ? raw.description : undefined,
    deprecated: raw.deprecated === true,
    schema: raw.schema && typeof raw.schema === 'object'
      ? transformSchema(raw.schema as RawSchema)
      : undefined,
    example: raw.example,
    style: typeof raw.style === 'string' ? raw.style : undefined,
    explode: typeof raw.explode === 'boolean' ? raw.explode : undefined,
  }
}

function transformMediaTypes(
  content: Record<string, unknown> | undefined,
): readonly MediaTypeInfo[] {
  if (!content || typeof content !== 'object') return []
  return Object.entries(content).map(([mediaType, value]) => {
    const raw = value as Record<string, unknown> | null
    return {
      mediaType,
      schema: raw?.schema && typeof raw.schema === 'object'
        ? transformSchema(raw.schema as RawSchema)
        : undefined,
      example: raw?.example,
    }
  })
}

function transformRequestBody(raw: unknown): RequestBodyInfo | undefined {
  if (!raw || typeof raw !== 'object') return undefined
  const body = raw as Record<string, unknown>
  return {
    description: typeof body.description === 'string' ? body.description : undefined,
    required: body.required === true,
    content: transformMediaTypes(body.content as Record<string, unknown> | undefined),
  }
}

function transformResponseHeaders(
  headers: Record<string, unknown> | undefined,
): readonly ResponseHeaderInfo[] {
  if (!headers || typeof headers !== 'object') return []
  return Object.entries(headers).map(([name, value]) => {
    const raw = value as Record<string, unknown> | null
    return {
      name,
      description: typeof raw?.description === 'string' ? raw.description : undefined,
      schema: raw?.schema && typeof raw.schema === 'object'
        ? transformSchema(raw.schema as RawSchema)
        : undefined,
      required: raw?.required === true,
    }
  })
}

function transformResponses(
  responses: Record<string, unknown> | undefined,
): readonly ResponseInfo[] {
  if (!responses || typeof responses !== 'object') return []
  return Object.entries(responses).map(([statusCode, value]) => {
    const raw = value as Record<string, unknown> | null
    return {
      statusCode,
      description: typeof raw?.description === 'string' ? raw.description : '',
      content: transformMediaTypes(raw?.content as Record<string, unknown> | undefined),
      headers: transformResponseHeaders(raw?.headers as Record<string, unknown> | undefined),
    }
  })
}

function transformSecurity(
  security: unknown,
): readonly SecurityRequirement[] | undefined {
  if (!Array.isArray(security)) return undefined
  return security.flatMap((entry) => {
    if (!entry || typeof entry !== 'object') return []
    return Object.entries(entry as Record<string, unknown>).map(([name, scopes]) => ({
      name,
      scopes: Array.isArray(scopes) ? scopes.map(String) : [],
    }))
  })
}

function mergeParameters(
  pathParams: RawParam[] | undefined,
  operationParams: RawParam[] | undefined,
): readonly ParameterInfo[] {
  const merged = new Map<string, ParameterInfo>()

  // Path-level params first
  if (Array.isArray(pathParams)) {
    for (const raw of pathParams) {
      const param = transformParameter(raw)
      merged.set(`${param.location}:${param.name}`, param)
    }
  }

  // Operation-level params override
  if (Array.isArray(operationParams)) {
    for (const raw of operationParams) {
      const param = transformParameter(raw)
      merged.set(`${param.location}:${param.name}`, param)
    }
  }

  return [...merged.values()]
}

export function transformEndpoint(
  path: string,
  method: string,
  operation: RawOperation,
  pathParameters?: RawParam[],
): Endpoint {
  const tags = Array.isArray(operation.tags)
    ? operation.tags.map(String)
    : []

  return {
    id: `${method}:${path}`,
    method: method as HttpMethod,
    path,
    summary: typeof operation.summary === 'string' ? operation.summary : undefined,
    description: typeof operation.description === 'string' ? operation.description : undefined,
    operationId: typeof operation.operationId === 'string' ? operation.operationId : undefined,
    tags,
    deprecated: operation.deprecated === true,
    parameters: mergeParameters(
      pathParameters,
      operation.parameters as RawParam[] | undefined,
    ),
    requestBody: transformRequestBody(operation.requestBody),
    responses: transformResponses(operation.responses as Record<string, unknown> | undefined),
    security: transformSecurity(operation.security),
  }
}

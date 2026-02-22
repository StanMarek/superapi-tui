import { useState, useCallback, useEffect, useRef } from 'react'
import type {
  Endpoint,
  ServerInfo,
  ResponseTab,
  HttpResponse,
} from '@/types/index.js'
import { resolveServerUrl, buildRequestUrl, sendRequest } from '@/http/index.js'
import { generateBodyTemplate } from '@/http/index.js'

export interface RequestState {
  readonly selectedServerIndex: number
  readonly cycleServer: () => void
  readonly paramValues: ReadonlyMap<string, string>
  readonly setParamValue: (key: string, value: string) => void
  readonly bodyText: string
  readonly setBodyText: (text: string) => void
  readonly bodyError: string | null
  readonly validateBody: (text?: string) => boolean
  readonly response: HttpResponse | null
  readonly error: string | null
  readonly isLoading: boolean
  readonly activeTab: ResponseTab
  readonly setActiveTab: (tab: ResponseTab) => void
  readonly send: (servers: readonly ServerInfo[]) => void
}

export function useRequestState(endpoint: Endpoint | null): RequestState {
  const [selectedServerIndex, setSelectedServerIndex] = useState(0)
  const [paramValues, setParamValues] = useState<Map<string, string>>(new Map())
  const [bodyText, setBodyText] = useState('{}')
  const [bodyError, setBodyError] = useState<string | null>(null)
  const [response, setResponse] = useState<HttpResponse | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [activeTab, setActiveTab] = useState<ResponseTab>('pretty')
  const isLoadingRef = useRef(false)
  const requestIdRef = useRef(0)

  // Reset state on endpoint change (except server index)
  useEffect(() => {
    setParamValues(new Map())
    setResponse(null)
    setError(null)
    setIsLoading(false)
    isLoadingRef.current = false
    requestIdRef.current += 1
    setActiveTab('pretty')
    setBodyError(null)

    if (endpoint?.requestBody) {
      const jsonMedia = endpoint.requestBody.content.find(
        m => m.mediaType === 'application/json',
      )
      if (jsonMedia?.schema) {
        setBodyText(generateBodyTemplate(jsonMedia.schema))
      } else {
        setBodyText('{}')
      }
    } else {
      setBodyText('{}')
    }
  }, [endpoint])

  const cycleServer = useCallback(() => {
    setSelectedServerIndex(prev => prev + 1)
  }, [])

  const setParamValue = useCallback((key: string, value: string) => {
    setParamValues(prev => {
      const next = new Map(prev)
      next.set(key, value)
      return next
    })
  }, [])

  const validateBody = useCallback((text?: string): boolean => {
    const toValidate = text ?? bodyText
    try {
      JSON.parse(toValidate)
      setBodyError(null)
      return true
    } catch (e) {
      const detail = e instanceof SyntaxError ? e.message : 'Invalid JSON'
      setBodyError(detail)
      return false
    }
  }, [bodyText])

  const send = useCallback(
    (servers: readonly ServerInfo[]) => {
      if (isLoadingRef.current || !endpoint) {
        return
      }

      if (servers.length === 0) {
        setError('No servers defined')
        return
      }

      const serverIdx = selectedServerIndex % servers.length
      const server = servers[serverIdx]
      const serverUrl = resolveServerUrl(server)

      // Build path params and validate required ones
      const pathParams = new Map<string, string>()
      for (const param of endpoint.parameters) {
        if (param.location === 'path') {
          const key = `path:${param.name}`
          const value = paramValues.get(key)
          if (value) {
            pathParams.set(param.name, value)
          } else {
            setError(`Missing required path parameter: ${param.name}`)
            return
          }
        }
      }

      let url = buildRequestUrl(serverUrl, endpoint.path, pathParams)

      // Append query params
      const queryParams = new URLSearchParams()
      for (const param of endpoint.parameters) {
        if (param.location === 'query') {
          const key = `query:${param.name}`
          const value = paramValues.get(key)
          if (value) {
            queryParams.set(param.name, value)
          }
        }
      }
      const queryString = queryParams.toString()
      if (queryString) {
        url += `?${queryString}`
      }

      // Build headers from header params
      const headers = new Map<string, string>()
      for (const param of endpoint.parameters) {
        if (param.location === 'header') {
          const key = `header:${param.name}`
          const value = paramValues.get(key)
          if (value) {
            headers.set(param.name, value)
          }
        }
      }

      // Add Content-Type when endpoint has a request body
      const hasBody = endpoint.requestBody !== undefined
      if (hasBody) {
        headers.set('Content-Type', 'application/json')
      }

      setIsLoading(true)
      isLoadingRef.current = true
      setError(null)

      const currentRequestId = ++requestIdRef.current

      sendRequest({
        method: endpoint.method,
        url,
        headers,
        body: hasBody ? bodyText : undefined,
      })
        .then(res => {
          if (requestIdRef.current !== currentRequestId) return
          setResponse(res)
          setActiveTab('pretty')
        })
        .catch((err: unknown) => {
          if (requestIdRef.current !== currentRequestId) return
          const message =
            err instanceof Error ? err.message : String(err)
          setError(message)
        })
        .finally(() => {
          if (requestIdRef.current !== currentRequestId) return
          setIsLoading(false)
          isLoadingRef.current = false
        })
    },
    [endpoint, selectedServerIndex, paramValues, bodyText],
  )

  return {
    selectedServerIndex,
    cycleServer,
    paramValues,
    setParamValue,
    bodyText,
    setBodyText,
    bodyError,
    validateBody,
    response,
    error,
    isLoading,
    activeTab,
    setActiveTab,
    send,
  }
}

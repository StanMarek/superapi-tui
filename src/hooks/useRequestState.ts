import { useState, useCallback, useEffect, useRef, useMemo } from 'react'
import type {
  Endpoint,
  ServerInfo,
  ResponseTab,
  HttpResponse,
  SecuritySchemeInfo,
  AuthCredentials,
  AuthFieldKey,
  AuthState,
} from '@/types/index.js'
import { resolveServerUrl, buildRequestUrl, sendRequest, deriveAuthOptions, applyAuth } from '@/http/index.js'
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
  readonly auth: AuthState
}

export function useRequestState(
  endpoint: Endpoint | null,
  securitySchemes: readonly SecuritySchemeInfo[],
): RequestState {
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

  // Auth state — persists across endpoint changes
  const [authExpanded, setAuthExpanded] = useState(false)
  const [selectedOptionIndex, setSelectedOptionIndex] = useState(0)
  const [authToken, setAuthToken] = useState('')
  const [authKey, setAuthKey] = useState('')
  const [authUsername, setAuthUsername] = useState('')
  const [authPassword, setAuthPassword] = useState('')

  const authResult = useMemo(
    () => deriveAuthOptions(securitySchemes),
    [securitySchemes],
  )
  const availableOptions = authResult.options
  const unsupportedSchemes = authResult.unsupportedSchemes

  // Build credentials from current selection + field values
  const selectedOption = availableOptions[selectedOptionIndex % availableOptions.length] as typeof availableOptions[number] | undefined

  const credentials: AuthCredentials = useMemo(() => {
    if (!selectedOption) return { method: 'none' }

    switch (selectedOption.method) {
      case 'bearer':
        return { method: 'bearer', token: authToken }
      case 'apiKey':
        return {
          method: 'apiKey',
          key: authKey,
          paramName: selectedOption.apiKeyParamName,
          location: selectedOption.apiKeyIn,
        }
      case 'basic':
        return { method: 'basic', username: authUsername, password: authPassword }
      default: {
        const _exhaustive: never = selectedOption
        throw new Error(`Unsupported auth method: ${(_exhaustive as { method: string }).method}`)
      }
    }
  }, [selectedOption, authToken, authKey, authUsername, authPassword])

  // Reset state on endpoint change (except server index and auth)
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

  const toggleAuth = useCallback(() => {
    setAuthExpanded(prev => !prev)
  }, [])

  const cycleAuthOption = useCallback(() => {
    setSelectedOptionIndex(prev => (prev + 1) % availableOptions.length)
  }, [availableOptions.length])

  const setAuthField = useCallback((field: AuthFieldKey, value: string) => {
    switch (field) {
      case 'token':
        setAuthToken(value)
        break
      case 'key':
        setAuthKey(value)
        break
      case 'username':
        setAuthUsername(value)
        break
      case 'password':
        setAuthPassword(value)
        break
      default: {
        const _exhaustive: never = field
        throw new Error(`Unknown auth field: ${_exhaustive}`)
      }
    }
  }, [])

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

      // Collect query params into a Map first
      const queryParams = new Map<string, string>()
      for (const param of endpoint.parameters) {
        if (param.location === 'query') {
          const key = `query:${param.name}`
          const value = paramValues.get(key)
          if (value) {
            queryParams.set(param.name, value)
          }
        }
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

      // Apply auth — intentionally overrides user-supplied header params with same name
      const authResult = applyAuth(credentials)
      for (const [key, value] of authResult.headers) {
        headers.set(key, value)
      }
      for (const [key, value] of authResult.queryParams) {
        queryParams.set(key, value)
      }

      // Append query params to URL
      const searchParams = new URLSearchParams()
      for (const [key, value] of queryParams) {
        searchParams.set(key, value)
      }
      const queryString = searchParams.toString()
      if (queryString) {
        url += `?${queryString}`
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
    [endpoint, selectedServerIndex, paramValues, bodyText, credentials],
  )

  const auth: AuthState = useMemo(() => ({
    authExpanded,
    toggleAuth,
    availableOptions,
    unsupportedSchemes,
    selectedOptionIndex,
    cycleAuthOption,
    credentials,
    setAuthField,
  }), [authExpanded, toggleAuth, availableOptions, unsupportedSchemes, selectedOptionIndex, cycleAuthOption, credentials, setAuthField])

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
    auth,
  }
}

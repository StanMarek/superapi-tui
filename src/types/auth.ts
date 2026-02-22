export type AuthMethod = 'bearer' | 'apiKey' | 'basic'

export interface AuthOption {
  readonly method: AuthMethod
  readonly label: string
  readonly schemeName: string
  readonly apiKeyIn?: 'header' | 'query'
  readonly apiKeyParamName?: string
}

export type AuthCredentials =
  | { readonly method: 'none' }
  | { readonly method: 'bearer'; readonly token: string }
  | { readonly method: 'apiKey'; readonly key: string; readonly paramName: string; readonly location: 'header' | 'query' }
  | { readonly method: 'basic'; readonly username: string; readonly password: string }

export interface AuthState {
  readonly authExpanded: boolean
  readonly toggleAuth: () => void
  readonly availableOptions: readonly AuthOption[]
  readonly selectedOptionIndex: number
  readonly cycleAuthOption: () => void
  readonly credentials: AuthCredentials
  readonly setAuthField: (field: string, value: string) => void
}

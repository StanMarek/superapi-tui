export type AuthMethod = 'bearer' | 'apiKey' | 'basic'

export type AuthFieldKey = 'token' | 'key' | 'username' | 'password'

export type AuthOption =
  | { readonly method: 'bearer'; readonly label: string; readonly schemeName: string }
  | { readonly method: 'apiKey'; readonly label: string; readonly schemeName: string; readonly apiKeyIn: 'header' | 'query'; readonly apiKeyParamName: string }
  | { readonly method: 'basic'; readonly label: string; readonly schemeName: string }

export type AuthCredentials =
  | { readonly method: 'none' }
  | { readonly method: 'bearer'; readonly token: string }
  | { readonly method: 'apiKey'; readonly key: string; readonly paramName: string; readonly location: 'header' | 'query' }
  | { readonly method: 'basic'; readonly username: string; readonly password: string }

export interface AuthState {
  readonly authExpanded: boolean
  readonly toggleAuth: () => void
  readonly availableOptions: readonly AuthOption[]
  readonly unsupportedSchemes: readonly string[]
  readonly selectedOptionIndex: number
  readonly cycleAuthOption: () => void
  readonly credentials: AuthCredentials
  readonly setAuthField: (field: AuthFieldKey, value: string) => void
  readonly restoreAuth: (auth: Exclude<AuthCredentials, { method: 'none' }>) => void
}

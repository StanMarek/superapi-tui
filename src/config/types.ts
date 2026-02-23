import type { ResponseTab } from '@/types/http.js'

export type SavedAuth =
  | { readonly method: 'bearer'; readonly token: string }
  | { readonly method: 'apiKey'; readonly key: string; readonly paramName: string; readonly location: 'header' | 'query' }
  | { readonly method: 'basic'; readonly username: string; readonly password: string }

export interface SavedServer {
  readonly name: string
  readonly url: string
  readonly auth?: SavedAuth
}

export interface Preferences {
  readonly defaultResponseTab: ResponseTab
}

export interface ConfigData {
  readonly servers: readonly SavedServer[]
  readonly preferences: Preferences
}

export const DEFAULT_PREFERENCES: Preferences = {
  defaultResponseTab: 'pretty',
}

export const DEFAULT_CONFIG: ConfigData = {
  servers: [],
  preferences: DEFAULT_PREFERENCES,
}

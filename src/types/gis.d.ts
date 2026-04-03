// Type declarations for Google Identity Services (GIS) client library.
// Loaded via <script src="https://accounts.google.com/gsi/client"> in index.html.
// This file is a global ambient module — no imports/exports so interfaces are globally available.

interface TokenClientConfig {
  client_id: string
  scope: string
  callback: (response: TokenResponse) => void
  error_callback?: (error: TokenError) => void
  prompt?: string
}

interface TokenResponse {
  access_token: string
  expires_in: number
  scope: string
  token_type: string
  error?: string
  error_description?: string
}

interface TokenError {
  type: string
  message?: string
}

interface TokenClient {
  requestAccessToken(overrideConfig?: { prompt?: string }): void
}

interface RevokeTokenResponse {
  successful: boolean
  error?: string
  error_description?: string
}

interface GoogleOAuth2 {
  initTokenClient(config: TokenClientConfig): TokenClient
  revokeToken(token: string, callback?: (response: RevokeTokenResponse) => void): void
}

interface GoogleAccounts {
  oauth2: GoogleOAuth2
}

interface Google {
  accounts: GoogleAccounts
}

interface Window {
  google: Google
}

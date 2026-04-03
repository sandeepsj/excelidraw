// Google Identity Services (GIS) token client wrapper.
// The GIS script is loaded asynchronously in index.html.
// All exports are safe to call before the script loads — they wait internally.

const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID as string
const SCOPE = 'https://www.googleapis.com/auth/drive.appdata email profile'

/** Resolves when window.google is available (GIS script has loaded). */
export function whenReady(): Promise<void> {
  if (window.google?.accounts?.oauth2) return Promise.resolve()
  return new Promise((resolve) => {
    const interval = setInterval(() => {
      if (window.google?.accounts?.oauth2) {
        clearInterval(interval)
        resolve()
      }
    }, 50)
  })
}

function getTokenClient(callback: (r: TokenResponse) => void, errorCallback?: (e: TokenError) => void): TokenClient {
  return window.google.accounts.oauth2.initTokenClient({
    client_id: CLIENT_ID,
    scope: SCOPE,
    callback,
    error_callback: errorCallback,
  })
}

/**
 * Request a Drive access token.
 * @param prompt '' for silent (no UI), 'consent' or 'select_account' for explicit login
 * @returns TokenResponse on success, throws on error
 */
export function requestToken(prompt: string): Promise<TokenResponse> {
  return new Promise((resolve, reject) => {
    const client = getTokenClient(
      (response) => {
        if (response.error) {
          reject(new Error(response.error_description ?? response.error))
        } else {
          resolve(response)
        }
      },
      (error) => reject(new Error(error.message ?? error.type))
    )
    client.requestAccessToken({ prompt })
  })
}

/** Revoke a token (sign out from Google) */
export function revokeToken(token: string): Promise<void> {
  return new Promise((resolve) => {
    window.google.accounts.oauth2.revokeToken(token, () => resolve())
  })
}

/** Fetch user info using the Drive access token */
export async function fetchUserInfo(accessToken: string): Promise<{ sub: string; email: string; name: string }> {
  const res = await fetch(
    `https://www.googleapis.com/oauth2/v3/userinfo?access_token=${encodeURIComponent(accessToken)}`
  )
  if (!res.ok) throw new Error('Failed to fetch user info')
  return res.json()
}

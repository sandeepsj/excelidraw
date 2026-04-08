'use client'

import { createContext, useEffect, useRef, useState, useCallback, ReactNode } from 'react'
import { whenReady, requestToken, revokeToken, fetchUserInfo } from '@/lib/auth/gis'
import { clearFolderCache } from '@/lib/drive/folder'
import type { AppUser } from '@/types/user'

export type AuthStatus = 'loading' | 'authenticated' | 'unauthenticated'

interface AuthContextType {
  user: AppUser | null
  driveToken: string | null
  status: AuthStatus
  signIn: () => Promise<void>
  signOut: () => Promise<void>
}

export const AuthContext = createContext<AuthContextType>({
  user: null,
  driveToken: null,
  status: 'loading',
  signIn: async () => {},
  signOut: async () => {},
})

const STORAGE_KEY = 'excelidraw_auth'

function saveSession(token: string, expiresIn: number, user: AppUser) {
  const expiresAt = Date.now() + expiresIn * 1000
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ token, expiresAt, user }))
}

function loadSession(): { token: string; expiresAt: number; user: AppUser } | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const data = JSON.parse(raw)
    // Require at least 60s remaining to be usable
    if (data.expiresAt - Date.now() < 60_000) return null
    return data
  } catch {
    return null
  }
}

function clearSession() {
  localStorage.removeItem(STORAGE_KEY)
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AppUser | null>(null)
  const [driveToken, setDriveToken] = useState<string | null>(null)
  const [status, setStatus] = useState<AuthStatus>('loading')
  const refreshTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const scheduleRefresh = useCallback((expiresIn: number) => {
    if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current)
    const delay = Math.max((expiresIn - 300) * 1000, 0)
    refreshTimerRef.current = setTimeout(async () => {
      try {
        const response = await requestToken('')
        setDriveToken(response.access_token)
        scheduleRefresh(response.expires_in)
      } catch {
        // Silent refresh failed — session probably expired; stay authenticated
        // until the user tries an action that fails, then they'll see a prompt.
      }
    }, delay)
  }, [])

  const handleTokenResponse = useCallback(async (accessToken: string, expiresIn: number) => {
    try {
      const info = await fetchUserInfo(accessToken)
      const appUser = { uid: info.sub, email: info.email, displayName: info.name }
      setUser(appUser)
      setDriveToken(accessToken)
      setStatus('authenticated')
      saveSession(accessToken, expiresIn, appUser)
      scheduleRefresh(expiresIn)
    } catch {
      setStatus('unauthenticated')
    }
  }, [scheduleRefresh])

  // On mount: restore from localStorage first, then try silent GIS refresh
  useEffect(() => {
    let cancelled = false

    const saved = loadSession()
    if (saved) {
      setUser(saved.user)
      setDriveToken(saved.token)
      setStatus('authenticated')
      const remainingSec = Math.floor((saved.expiresAt - Date.now()) / 1000)
      scheduleRefresh(remainingSec)
    }

    whenReady().then(async () => {
      if (cancelled) return
      try {
        const response = await requestToken('')
        if (!cancelled) await handleTokenResponse(response.access_token, response.expires_in)
      } catch {
        // Silent refresh failed — if we restored from storage, stay authenticated
        if (!cancelled && !saved) setStatus('unauthenticated')
      }
    })
    return () => {
      cancelled = true
      if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current)
    }
  }, [handleTokenResponse, scheduleRefresh])

  const signIn = useCallback(async () => {
    await whenReady()
    const response = await requestToken('consent')
    await handleTokenResponse(response.access_token, response.expires_in)
  }, [handleTokenResponse])

  const signOut = useCallback(async () => {
    if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current)
    if (driveToken) {
      await revokeToken(driveToken).catch(() => {})
    }
    clearFolderCache()
    clearSession()
    setUser(null)
    setDriveToken(null)
    setStatus('unauthenticated')
  }, [driveToken])

  return (
    <AuthContext.Provider value={{ user, driveToken, status, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}

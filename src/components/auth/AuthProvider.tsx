'use client'

import { createContext, useEffect, useRef, useState, useCallback, ReactNode } from 'react'
import { whenReady, requestToken, revokeToken, fetchUserInfo } from '@/lib/auth/gis'
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
      setUser({ uid: info.sub, email: info.email, displayName: info.name })
      setDriveToken(accessToken)
      setStatus('authenticated')
      scheduleRefresh(expiresIn)
    } catch {
      setStatus('unauthenticated')
    }
  }, [scheduleRefresh])

  // On mount: wait for GIS script then try silent token
  useEffect(() => {
    let cancelled = false
    whenReady().then(async () => {
      if (cancelled) return
      try {
        const response = await requestToken('')
        if (!cancelled) await handleTokenResponse(response.access_token, response.expires_in)
      } catch {
        if (!cancelled) setStatus('unauthenticated')
      }
    })
    return () => {
      cancelled = true
      if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current)
    }
  }, [handleTokenResponse])

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

'use client'

import { createContext, useEffect, useState, ReactNode } from 'react'
import type { User } from 'firebase/auth'

interface AuthContextType {
  user: User | null
  loading: boolean
}

export const AuthContext = createContext<AuthContextType>({ user: null, loading: true })

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Lazy import — Firebase never initializes during SSR
    let unsubscribe: (() => void) | undefined

    Promise.all([
      import('@/lib/firebase/auth'),
      import('firebase/auth'),
    ]).then(([{ getFirebaseAuth }, { onAuthStateChanged }]) => {
      unsubscribe = onAuthStateChanged(getFirebaseAuth(), (u) => {
        setUser(u)
        setLoading(false)
      })
    })

    return () => unsubscribe?.()
  }, [])

  return (
    <AuthContext.Provider value={{ user, loading }}>
      {children}
    </AuthContext.Provider>
  )
}

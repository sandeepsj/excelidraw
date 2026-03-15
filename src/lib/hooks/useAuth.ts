'use client'

import { useContext } from 'react'
import { AuthContext } from '@/components/auth/AuthProvider'

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) return { user: null, loading: true }
  return ctx
}

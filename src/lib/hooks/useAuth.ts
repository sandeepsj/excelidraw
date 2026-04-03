'use client'

import { useContext } from 'react'
import { AuthContext } from '@/components/auth/AuthProvider'
import type { AppUser } from '@/types/user'

export type { AppUser }

export function useAuth() {
  return useContext(AuthContext)
}

'use client'

import { useState, useEffect } from 'react'
import { listenUserDiagrams } from '@/lib/firebase/firestore'
import type { Diagram } from '@/types/diagram'

export function useDiagrams(userId: string | null) {
  const [diagrams, setDiagrams] = useState<Diagram[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!userId) {
      setDiagrams([])
      setLoading(false)
      return
    }

    setLoading(true)
    const unsubscribe = listenUserDiagrams(userId, (data) => {
      setDiagrams(data)
      setLoading(false)
    })

    return unsubscribe
  }, [userId])

  return { diagrams, loading }
}

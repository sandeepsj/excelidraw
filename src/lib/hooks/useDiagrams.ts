'use client'

import { useState, useEffect, useCallback } from 'react'
import { listDiagrams } from '@/lib/drive/diagrams'
import type { Diagram } from '@/types/diagram'

export function useDiagrams(userId: string | null, driveToken: string | null) {
  const [diagrams, setDiagrams] = useState<Diagram[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    if (!userId || !driveToken) {
      setDiagrams([])
      setLoading(false)
      return
    }
    try {
      const data = await listDiagrams(driveToken)
      setDiagrams(data)
    } catch {
      // Token may have expired; leave stale data, caller can refresh
    } finally {
      setLoading(false)
    }
  }, [userId, driveToken])

  // Initial load
  useEffect(() => {
    setLoading(true)
    load()
  }, [load])

  // Re-fetch when window regains focus (covers tab switching, page return)
  useEffect(() => {
    const onFocus = () => load()
    window.addEventListener('visibilitychange', onFocus)
    return () => window.removeEventListener('visibilitychange', onFocus)
  }, [load])

  return { diagrams, loading, refresh: load }
}

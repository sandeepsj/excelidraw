'use client'

import { DiagramCard } from './DiagramCard'
import type { Diagram } from '@/types/diagram'

interface DiagramGridProps {
  diagrams: Diagram[]
  loading: boolean
}

export function DiagramGrid({ diagrams, loading }: DiagramGridProps) {
  if (loading) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="h-48 rounded-lg bg-muted animate-pulse" />
        ))}
      </div>
    )
  }

  if (diagrams.length === 0) {
    return (
      <div className="text-center py-16 text-muted-foreground">
        No diagrams yet. Create your first one!
      </div>
    )
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
      {diagrams.map((d) => (
        <DiagramCard key={d.id} diagram={d} />
      ))}
    </div>
  )
}

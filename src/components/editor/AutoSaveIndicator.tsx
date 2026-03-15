'use client'

import { cn } from '@/lib/utils/cn'

type SaveStatus = 'saved' | 'saving' | 'unsaved'

interface AutoSaveIndicatorProps {
  status: SaveStatus
}

const labels: Record<SaveStatus, string> = {
  saved: 'Saved',
  saving: 'Saving...',
  unsaved: 'Unsaved changes',
}

export function AutoSaveIndicator({ status }: AutoSaveIndicatorProps) {
  return (
    <span
      className={cn('text-xs', {
        'text-muted-foreground': status === 'saved',
        'text-yellow-500': status === 'saving',
        'text-orange-500': status === 'unsaved',
      })}
    >
      {labels[status]}
    </span>
  )
}

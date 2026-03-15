'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardFooter } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Pin, PinOff, Trash2, ExternalLink } from 'lucide-react'
import { updateDiagram, deleteDiagram } from '@/lib/firebase/firestore'
import type { Diagram } from '@/types/diagram'

interface DiagramCardProps {
  diagram: Diagram
}

export function DiagramCard({ diagram }: DiagramCardProps) {
  const router = useRouter()
  const [deleting, setDeleting] = useState(false)

  const handlePin = async (e: React.MouseEvent) => {
    e.stopPropagation()
    await updateDiagram(diagram.id, { pinned: !diagram.pinned })
  }

  const handleDelete = async (e: React.MouseEvent) => {
    e.stopPropagation()
    if (!confirm(`Delete "${diagram.title}"?`)) return
    setDeleting(true)
    await deleteDiagram(diagram.id)
  }

  const handleOpen = () => router.push(`/diagram/${diagram.id}/edit`)
  const handleView = (e: React.MouseEvent) => {
    e.stopPropagation()
    window.open(`/diagram/${diagram.id}/view`, '_blank')
  }

  return (
    <Card
      className="cursor-pointer hover:shadow-md transition-shadow group"
      onClick={handleOpen}
    >
      <CardContent className="p-0">
        <div className="relative w-full h-36 bg-gray-50 rounded-t-lg overflow-hidden">
          {diagram.thumbnailUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={diagram.thumbnailUrl}
              alt={diagram.title}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="flex items-center justify-center h-full text-gray-300 text-sm">
              No preview
            </div>
          )}
          {diagram.pinned && (
            <Badge className="absolute top-2 left-2 text-xs">Pinned</Badge>
          )}
        </div>
        <div className="p-3">
          <h3 className="font-medium text-sm truncate">{diagram.title}</h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            {diagram.updatedAt?.toDate?.()?.toLocaleDateString() ?? ''}
          </p>
        </div>
      </CardContent>
      <CardFooter className="p-3 pt-0 gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <Button size="sm" variant="ghost" className="h-7 px-2" onClick={handlePin}>
          {diagram.pinned ? <PinOff className="h-3.5 w-3.5" /> : <Pin className="h-3.5 w-3.5" />}
        </Button>
        <Button size="sm" variant="ghost" className="h-7 px-2" onClick={handleView}>
          <ExternalLink className="h-3.5 w-3.5" />
        </Button>
        <Button
          size="sm"
          variant="ghost"
          className="h-7 px-2 text-destructive hover:text-destructive"
          onClick={handleDelete}
          disabled={deleting}
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </CardFooter>
    </Card>
  )
}

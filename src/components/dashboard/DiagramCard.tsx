'use client'

import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Card, CardContent, CardFooter } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Pin, PinOff, Trash2, ExternalLink } from 'lucide-react'

function GoogleDriveIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 87.3 78" xmlns="http://www.w3.org/2000/svg">
      <path d="M6.6 66.85l3.85 6.65c.8 1.4 1.95 2.5 3.3 3.3L27.5 53H0c0 1.55.4 3.1 1.2 4.5z" fill="#0066da"/>
      <path d="M43.65 25L29.9 0c-1.35.8-2.5 1.9-3.3 3.3L1.2 48.5A9.06 9.06 0 000 53h27.5z" fill="#00ac47"/>
      <path d="M73.55 76.8c1.35-.8 2.5-1.9 3.3-3.3l1.6-2.75L86.1 57.5c.8-1.4 1.2-2.95 1.2-4.5H59.8l5.85 11.75z" fill="#ea4335"/>
      <path d="M43.65 25L57.4 0H29.9z" fill="#00832d"/>
      <path d="M59.8 53H87.3L73.55 29.5H45.8z" fill="#2684fc"/>
      <path d="M43.65 25L59.8 53l13.75-23.5-13.75-2z" fill="#ffba00"/>
    </svg>
  )
}
import { updateDiagramMetadata, deleteDiagram } from '@/lib/drive/diagrams'
import type { Diagram } from '@/types/diagram'

interface DiagramCardProps {
  diagram: Diagram
  driveToken: string
  onRefresh: () => void
}

export function DiagramCard({ diagram, driveToken, onRefresh }: DiagramCardProps) {
  const navigate = useNavigate()
  const [deleting, setDeleting] = useState(false)

  const handlePin = async (e: React.MouseEvent) => {
    e.stopPropagation()
    await updateDiagramMetadata(driveToken, diagram.id, { pinned: !diagram.pinned })
    onRefresh()
  }

  const handleDelete = async (e: React.MouseEvent) => {
    e.stopPropagation()
    if (!confirm(`Delete "${diagram.title}"?`)) return
    setDeleting(true)
    await deleteDiagram(driveToken, diagram.id)
    onRefresh()
  }

  const handleOpen = () => navigate(`/diagram/${diagram.id}/edit`)
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
          <div className="flex items-center justify-center h-full text-gray-300 text-sm">
            No preview
          </div>
          {diagram.pinned && (
            <Badge className="absolute top-2 left-2 text-xs">Pinned</Badge>
          )}
          {diagram.driveUrl ? (
            <a
              href={diagram.driveUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="absolute top-2 right-2 p-1 rounded bg-white/80 hover:bg-white shadow-sm transition-colors"
              title="Open in Google Drive"
            >
              <GoogleDriveIcon className="h-4 w-4" />
            </a>
          ) : (
            <div className="absolute top-2 right-2 p-1 rounded bg-white/80 shadow-sm" title="Stored in Google Drive">
              <GoogleDriveIcon className="h-4 w-4" />
            </div>
          )}
        </div>
        <div className="p-3">
          <h3 className="font-medium text-sm truncate">{diagram.title}</h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            {new Date(diagram.updatedAt).toLocaleDateString()}
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

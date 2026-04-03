import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '@/lib/hooks/useAuth'
import { getDiagramMetadata, getDiagramScene, duplicateDiagram } from '@/lib/drive/diagrams'
import { ExcalidrawEditor } from '@/components/editor/ExcalidrawEditor'
import { Button } from '@/components/ui/button'
import { Edit, Copy } from 'lucide-react'
import type { Diagram } from '@/types/diagram'
import type { ExcalidrawImperativeAPI } from '@excalidraw/excalidraw/types'

export default function ViewDiagramPage() {
  const { id } = useParams<{ id: string }>()
  const { user, driveToken } = useAuth()
  const navigate = useNavigate()

  const [diagram, setDiagram] = useState<Diagram | null>(null)
  const [scene, setScene] = useState<string | null>(null)
  const [isEmbedded, setIsEmbedded] = useState(false)
  const [duplicating, setDuplicating] = useState(false)
  const [notFound, setNotFound] = useState(false)

  useEffect(() => {
    setIsEmbedded(window.self !== window.top)
  }, [])

  useEffect(() => {
    if (!user || !driveToken || !id) return

    const load = async () => {
      const d = await getDiagramMetadata(driveToken, id)
      if (!d) { setNotFound(true); return }
      if (d.ownerId !== user.uid) { navigate('/dashboard'); return }
      setDiagram(d)
      try {
        const s = await getDiagramScene(driveToken, id)
        setScene(s)
      } catch {
        setScene(null)
      }
    }
    load()
  }, [id, user, driveToken, navigate])

  const handleDuplicate = async () => {
    if (!user || !driveToken || !id) return
    setDuplicating(true)
    try {
      const newId = await duplicateDiagram(driveToken, id, user)
      navigate(`/diagram/${newId}/edit`)
    } catch {
      setDuplicating(false)
    }
  }

  const CTA = (
    <div
      className={`flex gap-2 z-10 ${
        isEmbedded
          ? 'fixed bottom-4 left-1/2 -translate-x-1/2 bg-background/90 backdrop-blur border rounded-lg px-4 py-2 shadow-lg'
          : 'absolute top-4 right-4'
      }`}
    >
      <Button size="sm" onClick={() => navigate(`/diagram/${id}/edit`)} className="gap-1.5">
        <Edit className="h-4 w-4" /> Edit
      </Button>
      <Button size="sm" variant="outline" onClick={handleDuplicate} disabled={duplicating} className="gap-1.5">
        <Copy className="h-4 w-4" /> {duplicating ? 'Duplicating…' : 'Duplicate'}
      </Button>
    </div>
  )

  if (notFound) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">Diagram not found.</p>
      </div>
    )
  }

  if (!diagram) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground text-sm">Loading…</p>
      </div>
    )
  }

  return (
    <div className="relative w-full h-screen">
      {!isEmbedded && (
        <header className="absolute top-0 left-0 right-0 z-10 flex items-center gap-3 px-4 h-12 bg-background/80 backdrop-blur border-b">
          <h1 className="text-sm font-medium truncate">{diagram.title}</h1>
        </header>
      )}
      <div className={`w-full h-full ${!isEmbedded ? 'pt-12' : ''}`}>
        <ExcalidrawEditor
          initialScene={scene}
          onAPIReady={(_api: ExcalidrawImperativeAPI) => {}}
          onDirty={() => {}}
          readOnly
        />
      </div>
      {CTA}
    </div>
  )
}

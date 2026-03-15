'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useAuth } from '@/lib/hooks/useAuth'
import { getDiagram } from '@/lib/firebase/firestore'
import { downloadScene } from '@/lib/firebase/storage'
import { ExcalidrawEditor } from '@/components/editor/ExcalidrawEditor'
import { Button } from '@/components/ui/button'
import { Edit, GitFork } from 'lucide-react'
import type { Diagram } from '@/types/diagram'
import type { ExcalidrawImperativeAPI } from '@excalidraw/excalidraw/types'

export default function ViewPage() {
  const { id } = useParams<{ id: string }>()
  const { user } = useAuth()
  const router = useRouter()

  const [diagram, setDiagram] = useState<Diagram | null>(null)
  const [scene, setScene] = useState<string | null>(null)
  const [isEmbedded, setIsEmbedded] = useState(false)
  const [forking, setForking] = useState(false)
  const [notFound, setNotFound] = useState(false)

  useEffect(() => {
    setIsEmbedded(window.self !== window.top)
  }, [])

  useEffect(() => {
    const load = async () => {
      const d = await getDiagram(id)
      if (!d) { setNotFound(true); return }
      setDiagram(d)
      try {
        const s = await downloadScene(id)
        setScene(s)
      } catch {
        setScene(null)
      }
    }
    load()
  }, [id])

  const handleFork = async () => {
    if (!user) { router.push('/login'); return }
    setForking(true)
    try {
      const token = await user.getIdToken()
      const res = await fetch(`/diagram/${id}/api/fork`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) throw new Error('Fork failed')
      const { newId } = await res.json()
      router.push(`/diagram/${newId}/edit`)
    } catch (e) {
      console.error(e)
      setForking(false)
    }
  }

  const isOwner = user?.uid === diagram?.ownerId

  const CTA = (
    <div
      className={`flex gap-2 z-10 ${
        isEmbedded
          ? 'fixed bottom-4 left-1/2 -translate-x-1/2 bg-background/90 backdrop-blur border rounded-lg px-4 py-2 shadow-lg'
          : 'absolute top-4 right-4'
      }`}
    >
      {isOwner ? (
        <Button size="sm" onClick={() => router.push(`/diagram/${id}/edit`)} className="gap-1.5">
          <Edit className="h-4 w-4" /> Edit it
        </Button>
      ) : (
        <Button size="sm" onClick={handleFork} disabled={forking} className="gap-1.5">
          <GitFork className="h-4 w-4" /> {forking ? 'Forking…' : 'Fork it'}
        </Button>
      )}
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

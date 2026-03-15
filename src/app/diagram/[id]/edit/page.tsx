'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useState, useCallback } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { useAuth } from '@/lib/hooks/useAuth'
import { getDiagram } from '@/lib/firebase/firestore'
import { downloadScene } from '@/lib/firebase/storage'
import { useAutoSave } from '@/lib/hooks/useAutoSave'
import { ExcalidrawEditor } from '@/components/editor/ExcalidrawEditor'
import { EditorHeader } from '@/components/editor/EditorHeader'
import type { Diagram } from '@/types/diagram'
import type { ExcalidrawImperativeAPI } from '@excalidraw/excalidraw/types'

type SaveStatus = 'saved' | 'saving' | 'unsaved'

export default function EditPage() {
  const { id } = useParams<{ id: string }>()
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()

  const [diagram, setDiagram] = useState<Diagram | null>(null)
  const [initialScene, setInitialScene] = useState<string | null>(null)
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('saved')
  const [notFound, setNotFound] = useState(false)

  const { scheduleScene, setExcalidrawAPI } = useAutoSave(id, setSaveStatus)

  useEffect(() => {
    if (authLoading) return
    if (!user) { router.replace('/login'); return }

    const load = async () => {
      const d = await getDiagram(id)
      if (!d) { setNotFound(true); return }
      if (d.ownerId !== user.uid) { router.replace(`/diagram/${id}/view`); return }
      setDiagram(d)
      try {
        const scene = await downloadScene(id)
        setInitialScene(scene)
      } catch {
        setInitialScene(null)
      }
    }
    load()
  }, [id, user, authLoading, router])

  const handleAPIReady = useCallback(
    (api: ExcalidrawImperativeAPI) => {
      setExcalidrawAPI(api as unknown as Parameters<typeof setExcalidrawAPI>[0])
    },
    [setExcalidrawAPI]
  )

  const handleChange = useCallback(
    (sceneJson: string) => {
      scheduleScene(sceneJson)
    },
    [scheduleScene]
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
    <div className="flex flex-col h-screen">
      <EditorHeader diagramId={id} title={diagram.title} saveStatus={saveStatus} />
      <div className="flex-1 overflow-hidden">
        <ExcalidrawEditor
          initialScene={initialScene}
          onAPIReady={handleAPIReady}
          onChange={handleChange}
        />
      </div>
    </div>
  )
}

import { useEffect, useState, useCallback } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '@/lib/hooks/useAuth'
import { getDiagramMetadata, getDiagramScene } from '@/lib/drive/diagrams'
import { useAutoSave } from '@/lib/hooks/useAutoSave'
import { ExcalidrawEditor } from '@/components/editor/ExcalidrawEditor'
import { EditorHeader } from '@/components/editor/EditorHeader'
import type { Diagram } from '@/types/diagram'
import type { ExcalidrawImperativeAPI } from '@excalidraw/excalidraw/types'

type SaveStatus = 'saved' | 'saving' | 'unsaved'

export default function EditDiagramPage() {
  const { id } = useParams<{ id: string }>()
  const { user, driveToken, signOut } = useAuth()
  const navigate = useNavigate()

  const [diagram, setDiagram] = useState<Diagram | null>(null)
  const [initialScene, setInitialScene] = useState<string | null | undefined>(undefined)
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('saved')
  const [notFound, setNotFound] = useState(false)
  const [panelVisible, setPanelVisible] = useState(false)

  const handleAuthError = useCallback(() => signOut(), [signOut])

  const { markDirty, setExcalidrawAPI } = useAutoSave(id ?? null, driveToken, setSaveStatus, handleAuthError)

  useEffect(() => {
    if (!user || !driveToken || !id) return

    const load = async () => {
      const d = await getDiagramMetadata(driveToken, id)
      if (!d) { setNotFound(true); return }
      if (d.ownerId !== user.uid) { navigate(`/diagram/${id}/view`); return }
      setDiagram(d)
      try {
        const scene = await getDiagramScene(driveToken, id)
        setInitialScene(scene)
      } catch {
        setInitialScene(null)
      }
    }
    load()
  }, [id, user, driveToken, navigate])

  const handleAPIReady = useCallback(
    (api: ExcalidrawImperativeAPI) => {
      setExcalidrawAPI(api as unknown as Parameters<typeof setExcalidrawAPI>[0])
    },
    [setExcalidrawAPI]
  )

  if (notFound) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">Diagram not found.</p>
      </div>
    )
  }

  if (!diagram || initialScene === undefined || !driveToken || !id) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground text-sm">Loading…</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-dvh">
      <EditorHeader
        diagramId={id}
        title={diagram.title}
        saveStatus={saveStatus}
        panelVisible={panelVisible}
        driveToken={driveToken}
        onTogglePanel={() => setPanelVisible((v) => !v)}
      />
      <div className="flex-1 min-h-0">
        <ExcalidrawEditor
          initialScene={initialScene}
          onAPIReady={handleAPIReady}
          onDirty={markDirty}
          panelVisible={panelVisible}
        />
      </div>
    </div>
  )
}

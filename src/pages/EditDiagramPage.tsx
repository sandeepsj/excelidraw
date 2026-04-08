import { useEffect, useState, useCallback, useMemo } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '@/lib/hooks/useAuth'
import { getDiagramMetadata, getDiagramScene, restoreDiagramFromHistory } from '@/lib/drive/diagrams'
import { useAutoSave } from '@/lib/hooks/useAutoSave'
import { ExcalidrawEditor } from '@/components/editor/ExcalidrawEditor'
import { EditorHeader } from '@/components/editor/EditorHeader'
import { Button } from '@/components/ui/button'
import type { Diagram } from '@/types/diagram'
import type { ExcalidrawImperativeAPI } from '@excalidraw/excalidraw/types'
import { History } from 'lucide-react'

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
  const [restoring, setRestoring] = useState(false)

  const handleAuthError = useCallback(() => signOut(), [signOut])

  const { markDirty, setExcalidrawAPI, saveNow } = useAutoSave(id ?? null, driveToken, setSaveStatus, handleAuthError)

  // Ctrl+S / Cmd+S to save
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault()
        saveNow()
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [saveNow])

  const sceneIsEmpty = useMemo(() => {
    if (!initialScene) return true
    try {
      const parsed = JSON.parse(initialScene)
      return !parsed.elements || parsed.elements.length === 0
    } catch {
      return true
    }
  }, [initialScene])

  const handleRestore = useCallback(async () => {
    if (!id || !driveToken) return
    setRestoring(true)
    try {
      const restored = await restoreDiagramFromHistory(driveToken, id)
      if (restored) {
        // Reload the page to pick up restored content
        window.location.reload()
      } else {
        alert('No previous version with content found in Drive history.')
      }
    } catch (err) {
      alert('Restore failed: ' + (err instanceof Error ? err.message : 'Unknown error'))
    } finally {
      setRestoring(false)
    }
  }, [id, driveToken])

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
        onSave={saveNow}
      />
      {sceneIsEmpty && (
        <div className="bg-amber-50 border-b border-amber-200 px-4 py-2 flex items-center gap-3 text-sm text-amber-800">
          <span>This diagram appears empty. It may have been accidentally overwritten.</span>
          <Button
            size="sm"
            variant="outline"
            className="gap-1.5 border-amber-300 hover:bg-amber-100"
            onClick={handleRestore}
            disabled={restoring}
          >
            <History className="h-3.5 w-3.5" />
            {restoring ? 'Restoring...' : 'Restore from history'}
          </Button>
        </div>
      )}
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

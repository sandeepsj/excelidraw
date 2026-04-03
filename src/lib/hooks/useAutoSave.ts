'use client'

import { useRef, useEffect, useCallback } from 'react'
import { updateDiagramScene } from '@/lib/drive/diagrams'
import { DriveAuthError } from '@/lib/drive/client'

const SCENE_DEBOUNCE_MS = 3000

interface ExcalidrawAPI {
  getSceneElements: () => unknown[]
  getAppState: () => Record<string, unknown>
  getFiles: () => Record<string, unknown>
}

type SaveStatus = 'saved' | 'saving' | 'unsaved'

export function useAutoSave(
  diagramId: string | null,
  driveToken: string | null,
  onStatusChange: (status: SaveStatus) => void,
  onAuthError: () => void
) {
  const sceneTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const excalidrawAPIRef = useRef<ExcalidrawAPI | null>(null)
  const lastSavedJsonRef = useRef<string | null>(null)
  const isDirtyRef = useRef(false)
  const tokenRef = useRef(driveToken)

  // Keep tokenRef in sync without re-creating flushScene
  useEffect(() => {
    tokenRef.current = driveToken
  }, [driveToken])

  const flushScene = useCallback(async () => {
    if (!diagramId || !excalidrawAPIRef.current || !isDirtyRef.current) return
    const token = tokenRef.current
    if (!token) return

    const { serializeAsJSON } = await import('@excalidraw/excalidraw')
    const api = excalidrawAPIRef.current
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const json = serializeAsJSON(api.getSceneElements() as any, api.getAppState() as any, api.getFiles() as any, 'local')

    if (json === lastSavedJsonRef.current) {
      onStatusChange('saved')
      isDirtyRef.current = false
      return
    }

    onStatusChange('saving')
    try {
      await updateDiagramScene(token, diagramId, json)
      lastSavedJsonRef.current = json
      isDirtyRef.current = false
      onStatusChange('saved')
    } catch (err) {
      if (err instanceof DriveAuthError) {
        onAuthError()
      } else {
        console.error('Auto-save failed:', err)
      }
      onStatusChange('unsaved')
    }
  }, [diagramId, onStatusChange, onAuthError])

  const markDirty = useCallback(() => {
    isDirtyRef.current = true
    onStatusChange('unsaved')
    if (sceneTimerRef.current) clearTimeout(sceneTimerRef.current)
    sceneTimerRef.current = setTimeout(flushScene, SCENE_DEBOUNCE_MS)
  }, [flushScene, onStatusChange])

  const setExcalidrawAPI = useCallback((api: ExcalidrawAPI) => {
    excalidrawAPIRef.current = api
  }, [])

  // Flush on unmount
  useEffect(() => {
    return () => {
      if (sceneTimerRef.current) clearTimeout(sceneTimerRef.current)
      flushScene()
    }
  }, [flushScene])

  return { markDirty, setExcalidrawAPI }
}

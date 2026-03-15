'use client'

import { useRef, useEffect, useCallback } from 'react'
import { uploadScene, uploadThumbnail } from '@/lib/firebase/storage'
import { updateDiagram } from '@/lib/firebase/firestore'

const SCENE_DEBOUNCE_MS = 3000
const THUMBNAIL_DEBOUNCE_MS = 15000

interface ExcalidrawAPI {
  getSceneElements: () => unknown[]
  getAppState: () => Record<string, unknown>
  getFiles: () => Record<string, unknown>
}

type SaveStatus = 'saved' | 'saving' | 'unsaved'

export function useAutoSave(
  diagramId: string | null,
  onStatusChange: (status: SaveStatus) => void
) {
  const sceneTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const thumbnailTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const excalidrawAPIRef = useRef<ExcalidrawAPI | null>(null)
  const lastSavedJsonRef = useRef<string | null>(null)
  const isDirtyRef = useRef(false)

  const flushScene = useCallback(async () => {
    if (!diagramId || !excalidrawAPIRef.current || !isDirtyRef.current) return

    // Serialize only at flush time — not on every keystroke
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
      await uploadScene(diagramId, json)
      lastSavedJsonRef.current = json
      isDirtyRef.current = false
      onStatusChange('saved')
    } catch (err) {
      console.error('Auto-save failed:', err)
      onStatusChange('unsaved')
    }
  }, [diagramId, onStatusChange])

  const flushThumbnail = useCallback(async () => {
    if (!diagramId || !excalidrawAPIRef.current) return
    try {
      const { exportToBlob } = await import('@excalidraw/excalidraw')
      const api = excalidrawAPIRef.current
      const elements = api.getSceneElements()
      if (!elements.length) return
      const blob = await exportToBlob({
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        elements: elements as any,
        appState: { ...api.getAppState(), exportBackground: true },
        files: null,
        mimeType: 'image/png',
        quality: 0.8,
      })
      const url = await uploadThumbnail(diagramId, blob)
      await updateDiagram(diagramId, { thumbnailUrl: url })
    } catch {
      // non-critical
    }
  }, [diagramId])

  const markDirty = useCallback(() => {
    isDirtyRef.current = true
    onStatusChange('unsaved')

    if (sceneTimerRef.current) clearTimeout(sceneTimerRef.current)
    sceneTimerRef.current = setTimeout(flushScene, SCENE_DEBOUNCE_MS)

    if (thumbnailTimerRef.current) clearTimeout(thumbnailTimerRef.current)
    thumbnailTimerRef.current = setTimeout(flushThumbnail, THUMBNAIL_DEBOUNCE_MS)
  }, [flushScene, flushThumbnail, onStatusChange])

  const setExcalidrawAPI = useCallback((api: ExcalidrawAPI) => {
    excalidrawAPIRef.current = api
  }, [])

  // Flush on unmount
  useEffect(() => {
    return () => {
      if (sceneTimerRef.current) clearTimeout(sceneTimerRef.current)
      if (thumbnailTimerRef.current) clearTimeout(thumbnailTimerRef.current)
      flushScene()
    }
  }, [flushScene])

  return { markDirty, setExcalidrawAPI }
}

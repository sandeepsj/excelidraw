'use client'

import { useRef, useEffect, useCallback } from 'react'
import { uploadScene, uploadThumbnail } from '@/lib/firebase/storage'
import { updateDiagram } from '@/lib/firebase/firestore'
import { useThumbnail } from './useThumbnail'

const SCENE_DEBOUNCE_MS = 3000
const THUMBNAIL_DEBOUNCE_MS = 15000

interface ExcalidrawAPI {
  getSceneElements: () => unknown[]
  getAppState: () => Record<string, unknown>
}

type SaveStatus = 'saved' | 'saving' | 'unsaved'

export function useAutoSave(
  diagramId: string | null,
  onStatusChange: (status: SaveStatus) => void
) {
  const sceneTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const thumbnailTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const excalidrawAPIRef = useRef<ExcalidrawAPI | null>(null)
  const pendingSceneRef = useRef<string | null>(null)
  const { generateThumbnail } = useThumbnail()

  const flushScene = useCallback(async () => {
    if (!diagramId || !pendingSceneRef.current) return
    onStatusChange('saving')
    try {
      await uploadScene(diagramId, pendingSceneRef.current)
      pendingSceneRef.current = null
      onStatusChange('saved')
    } catch (err) {
      console.error('Auto-save failed:', err)
      onStatusChange('unsaved')
    }
  }, [diagramId, onStatusChange])

  const flushThumbnail = useCallback(async () => {
    if (!diagramId || !excalidrawAPIRef.current) return
    try {
      const blob = await generateThumbnail(excalidrawAPIRef.current)
      if (!blob) return
      const url = await uploadThumbnail(diagramId, blob)
      await updateDiagram(diagramId, { thumbnailUrl: url })
    } catch {
      // Thumbnail errors are non-critical
    }
  }, [diagramId, generateThumbnail])

  const scheduleScene = useCallback(
    (sceneJson: string) => {
      pendingSceneRef.current = sceneJson
      onStatusChange('unsaved')

      if (sceneTimerRef.current) clearTimeout(sceneTimerRef.current)
      sceneTimerRef.current = setTimeout(flushScene, SCENE_DEBOUNCE_MS)

      if (thumbnailTimerRef.current) clearTimeout(thumbnailTimerRef.current)
      thumbnailTimerRef.current = setTimeout(flushThumbnail, THUMBNAIL_DEBOUNCE_MS)
    },
    [flushScene, flushThumbnail, onStatusChange]
  )

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

  return { scheduleScene, setExcalidrawAPI }
}

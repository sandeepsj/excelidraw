'use client'

import { useMemo, useCallback, useRef } from 'react'
import { Excalidraw } from '@excalidraw/excalidraw'
import '@excalidraw/excalidraw/index.css'
import type { ExcalidrawImperativeAPI } from '@excalidraw/excalidraw/types'

interface ExcalidrawInnerProps {
  initialScene: string | null
  onAPIReady: (api: ExcalidrawImperativeAPI) => void
  onDirty: () => void  // lightweight dirty signal — no serialization here
  readOnly?: boolean
}

export default function ExcalidrawInner({
  initialScene,
  onAPIReady,
  onDirty,
  readOnly = false,
}: ExcalidrawInnerProps) {
  const lastElementsHashRef = useRef<string>('')

  const initialData = useMemo(() => {
    if (!initialScene) return undefined
    try {
      const parsed = JSON.parse(initialScene)
      if (parsed.appState) {
        parsed.appState.collaborators = new Map(
          Object.entries(parsed.appState.collaborators ?? {})
        )
      }
      return parsed
    } catch {
      return undefined
    }
  }, [initialScene])

  const handleChange = useCallback(
    (elements: readonly { id: string; version: number }[]) => {
      if (readOnly) return
      // Cheap hash check — no serialization
      const hash = elements.map((e) => `${e.id}:${e.version}`).join(',')
      if (hash === lastElementsHashRef.current) return
      lastElementsHashRef.current = hash
      onDirty()
    },
    [onDirty, readOnly]
  )

  return (
    <div className="w-full h-full">
      <Excalidraw
        excalidrawAPI={(api) => onAPIReady(api as unknown as ExcalidrawImperativeAPI)}
        initialData={initialData}
        onChange={handleChange}
        viewModeEnabled={readOnly}
        UIOptions={{
          canvasActions: {
            saveToActiveFile: false,
            loadScene: !readOnly,
          },
        }}
      />
    </div>
  )
}

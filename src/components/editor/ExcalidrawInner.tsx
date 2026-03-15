'use client'

import { useEffect, useState, useCallback } from 'react'
import { Excalidraw } from '@excalidraw/excalidraw'
import '@excalidraw/excalidraw/index.css'
import type { ExcalidrawImperativeAPI } from '@excalidraw/excalidraw/types'

interface ExcalidrawInnerProps {
  initialScene: string | null
  onAPIReady: (api: ExcalidrawImperativeAPI) => void
  onChange: (sceneJson: string) => void
  readOnly?: boolean
}

export default function ExcalidrawInner({
  initialScene,
  onAPIReady,
  onChange,
  readOnly = false,
}: ExcalidrawInnerProps) {
  const [initialData, setInitialData] = useState<object | null>(null)

  useEffect(() => {
    if (initialScene) {
      try {
        setInitialData(JSON.parse(initialScene))
      } catch {
        // Ignore parse errors — start fresh
      }
    }
  }, [initialScene])

  const handleChange = useCallback(
    (elements: unknown, appState: unknown, files: unknown) => {
      if (readOnly) return
      onChange(JSON.stringify({ elements, appState, files }))
    },
    [onChange, readOnly]
  )

  return (
    <div className="w-full h-full">
      <Excalidraw
        excalidrawAPI={(api) => onAPIReady(api as unknown as ExcalidrawImperativeAPI)}
        initialData={initialData ?? undefined}
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

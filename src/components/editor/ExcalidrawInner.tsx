'use client'

import { useMemo, useCallback, useRef } from 'react'
import { Excalidraw } from '@excalidraw/excalidraw'
import '@excalidraw/excalidraw/index.css'
import type { ExcalidrawImperativeAPI } from '@excalidraw/excalidraw/types'

// Stroke widths: freedraw visually renders ~4x thicker than shapes at same value.
// We remember each independently so switching back restores the user's last choice.
const DEFAULT_SHAPE_STROKE_WIDTH = 2
const DEFAULT_FREEDRAW_STROKE_WIDTH = 0.5

interface ExcalidrawInnerProps {
  initialScene: string | null
  onAPIReady: (api: ExcalidrawImperativeAPI) => void
  onDirty: () => void
  panelVisible: boolean
  readOnly?: boolean
}

export default function ExcalidrawInner({
  initialScene,
  onAPIReady,
  onDirty,
  panelVisible,
  readOnly = false,
}: ExcalidrawInnerProps) {
  const lastElementsHashRef = useRef<string>('')
  const lastToolRef = useRef<string>('')
  const shapeStrokeWidthRef = useRef<number>(DEFAULT_SHAPE_STROKE_WIDTH)
  const freedrawStrokeWidthRef = useRef<number>(DEFAULT_FREEDRAW_STROKE_WIDTH)
  const apiRef = useRef<ExcalidrawImperativeAPI | null>(null)

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

  const handleAPIReady = useCallback((api: ExcalidrawImperativeAPI) => {
    apiRef.current = api
    onAPIReady(api)
  }, [onAPIReady])

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handleChange = useCallback((elements: readonly { id: string; version: number }[], appState: any) => {
    if (readOnly) return

    // Detect tool switch and sync stroke widths
    const currentTool: string = appState?.activeTool?.type ?? ''
    if (currentTool && currentTool !== lastToolRef.current) {
      const prevTool = lastToolRef.current
      // Save the stroke width of the tool we're leaving
      if (prevTool === 'freedraw') {
        freedrawStrokeWidthRef.current = appState.currentItemStrokeWidth ?? DEFAULT_FREEDRAW_STROKE_WIDTH
      } else if (prevTool) {
        shapeStrokeWidthRef.current = appState.currentItemStrokeWidth ?? DEFAULT_SHAPE_STROKE_WIDTH
      }
      // Defer updateScene so it runs after Excalidraw finishes its own onChange processing
      if (currentTool === 'freedraw') {
        const w = freedrawStrokeWidthRef.current
        setTimeout(() => apiRef.current?.updateScene({ appState: { currentItemStrokeWidth: w } }), 0)
      } else if (prevTool === 'freedraw') {
        const w = shapeStrokeWidthRef.current
        setTimeout(() => apiRef.current?.updateScene({ appState: { currentItemStrokeWidth: w } }), 0)
      }
      lastToolRef.current = currentTool
    }

    // Signal dirty only when elements actually change
    const hash = elements.map((e) => `${e.id}:${e.version}`).join(',')
    if (hash === lastElementsHashRef.current) return
    lastElementsHashRef.current = hash
    onDirty()
  }, [onDirty, readOnly])

  return (
    // hide-panels CSS class collapses the properties panel via globals.css
    <div className={`w-full h-full ${panelVisible ? '' : 'hide-panels'}`}>
      <Excalidraw
        excalidrawAPI={handleAPIReady}
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

'use client'

import { useMemo, useCallback, useRef, useEffect } from 'react'
import { Excalidraw } from '@excalidraw/excalidraw'
import '@excalidraw/excalidraw/index.css'
import type { ExcalidrawImperativeAPI } from '@excalidraw/excalidraw/types'

const DEFAULT_SHAPE_STROKE_WIDTH = 2
const DEFAULT_FREEDRAW_STROKE_WIDTH = 0.5

interface ExcalidrawInnerProps {
  initialScene: string | null
  onAPIReady: (api: ExcalidrawImperativeAPI) => void
  onDirty: () => void
  panelVisible: boolean
  readOnly?: boolean
}

// Selectors for the tool-specific properties panel across desktop + mobile layouts
const PANEL_SELECTORS = [
  '.App-menu_top__left',          // left column of top menu (hamburger + actions)
  '.layer-ui__wrapper .Island',   // floating Island panels (properties)
  'section[aria-labelledby]',     // accessible sections (stroke/fill/opacity)
  '.App-toolbar--mobile .Island', // mobile toolbar island
]

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
  const containerRef = useRef<HTMLDivElement>(null)

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

  // Toggle panel visibility via direct DOM manipulation — more reliable than CSS class guessing
  useEffect(() => {
    if (!containerRef.current) return

    const applyVisibility = () => {
      if (!containerRef.current) return
      const found = new Set<Element>()
      for (const selector of PANEL_SELECTORS) {
        containerRef.current.querySelectorAll(selector).forEach((el) => found.add(el))
      }
      found.forEach((el) => {
        ;(el as HTMLElement).style.display = panelVisible ? '' : 'none'
      })
    }

    // Apply immediately
    applyVisibility()

    // Re-apply after Excalidraw finishes rendering (it can re-mount panels)
    const timer = setTimeout(applyVisibility, 300)

    // Watch for DOM changes (Excalidraw may re-render panels on interaction)
    const observer = new MutationObserver(applyVisibility)
    observer.observe(containerRef.current, { childList: true, subtree: true })

    return () => {
      clearTimeout(timer)
      observer.disconnect()
    }
  }, [panelVisible])

  const handleAPIReady = useCallback((api: ExcalidrawImperativeAPI) => {
    apiRef.current = api
    onAPIReady(api)
  }, [onAPIReady])

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handleChange = useCallback((elements: readonly { id: string; version: number }[], appState: any) => {
    if (readOnly) return

    // Sync stroke widths between freedraw and shape tools
    const currentTool: string = appState?.activeTool?.type ?? ''
    if (currentTool && currentTool !== lastToolRef.current) {
      const prevTool = lastToolRef.current
      if (prevTool === 'freedraw') {
        freedrawStrokeWidthRef.current = appState.currentItemStrokeWidth ?? DEFAULT_FREEDRAW_STROKE_WIDTH
      } else if (prevTool) {
        shapeStrokeWidthRef.current = appState.currentItemStrokeWidth ?? DEFAULT_SHAPE_STROKE_WIDTH
      }
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
    <div ref={containerRef} className="w-full h-full">
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

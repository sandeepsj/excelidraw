'use client'

import { useCallback } from 'react'

export function useThumbnail() {
  const generateThumbnail = useCallback(
    async (excalidrawAPI: {
      getSceneElements: () => unknown[]
      getAppState: () => Record<string, unknown>
    }): Promise<Blob | null> => {
      try {
        const { exportToBlob } = await import('@excalidraw/excalidraw')
        const elements = excalidrawAPI.getSceneElements()
        const appState = excalidrawAPI.getAppState()

        if (!elements.length) return null

        const blob = await exportToBlob({
          elements: elements as Parameters<typeof exportToBlob>[0]['elements'],
          appState: { ...appState, exportBackground: true },
          files: null,
          mimeType: 'image/png',
          quality: 0.8,
        })
        return blob
      } catch {
        return null
      }
    },
    []
  )

  return { generateThumbnail }
}

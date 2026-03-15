'use client'

import dynamic from 'next/dynamic'
import type { ExcalidrawImperativeAPI } from '@excalidraw/excalidraw/types'

const ExcalidrawInner = dynamic(() => import('./ExcalidrawInner'), { ssr: false })

interface ExcalidrawEditorProps {
  initialScene: string | null
  onAPIReady: (api: ExcalidrawImperativeAPI) => void
  onDirty: () => void
  readOnly?: boolean
}

export function ExcalidrawEditor(props: ExcalidrawEditorProps) {
  return <ExcalidrawInner {...props} />
}

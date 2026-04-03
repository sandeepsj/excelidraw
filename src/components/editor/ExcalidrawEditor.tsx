import { lazy, Suspense } from 'react'
import type { ExcalidrawImperativeAPI } from '@excalidraw/excalidraw/types'

const ExcalidrawInner = lazy(() => import('./ExcalidrawInner'))

interface ExcalidrawEditorProps {
  initialScene: string | null
  onAPIReady: (api: ExcalidrawImperativeAPI) => void
  onDirty: () => void
  panelVisible?: boolean
  readOnly?: boolean
}

export function ExcalidrawEditor(props: ExcalidrawEditorProps) {
  return (
    <Suspense fallback={null}>
      <ExcalidrawInner {...props} panelVisible={props.panelVisible ?? true} />
    </Suspense>
  )
}

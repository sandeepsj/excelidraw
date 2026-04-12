import { useState, useEffect, useCallback, useRef } from 'react'
import { createPortal } from 'react-dom'
import type { ExcalidrawImperativeAPI } from '@excalidraw/excalidraw/types'

type ListType = 'bullet' | 'numbered' | 'none'

interface TextListToolbarProps {
  api: ExcalidrawImperativeAPI | null
  containerRef: React.RefObject<HTMLDivElement | null>
}

const BULLET_RE = /^• /
const NUMBERED_RE = /^\d+\. /

function detectListType(text: string): ListType {
  const lines = text.split('\n').filter((l) => l.trim())
  if (lines.length === 0) return 'none'
  if (lines.every((l) => BULLET_RE.test(l))) return 'bullet'
  if (lines.every((l) => NUMBERED_RE.test(l))) return 'numbered'
  return 'none'
}

function toBulletList(text: string): string {
  return text
    .split('\n')
    .map((line) => {
      const stripped = line.replace(BULLET_RE, '').replace(NUMBERED_RE, '')
      return stripped.trim() ? `• ${stripped}` : stripped
    })
    .join('\n')
}

function toNumberedList(text: string): string {
  let n = 1
  return text
    .split('\n')
    .map((line) => {
      const stripped = line.replace(BULLET_RE, '').replace(NUMBERED_RE, '')
      if (stripped.trim()) return `${n++}. ${stripped}`
      return stripped
    })
    .join('\n')
}

function removeListFormatting(text: string): string {
  return text
    .split('\n')
    .map((line) => line.replace(BULLET_RE, '').replace(NUMBERED_RE, ''))
    .join('\n')
}

export function TextListToolbar({ api, containerRef }: TextListToolbarProps) {
  const [selectedTextId, setSelectedTextId] = useState<string | null>(null)
  const [listType, setListType] = useState<ListType>('none')
  const [portalTarget, setPortalTarget] = useState<HTMLElement | null>(null)
  const pollRef = useRef<number>(0)

  // Find the portal target inside .App-menu__left
  useEffect(() => {
    if (!containerRef.current) return

    const find = () => {
      const panel = containerRef.current?.querySelector('.App-menu__left')
      if (panel && panel instanceof HTMLElement) {
        // Look for an existing portal mount, or create one
        let mount = panel.querySelector('[data-text-list-toolbar]') as HTMLElement | null
        if (!mount) {
          mount = document.createElement('div')
          mount.setAttribute('data-text-list-toolbar', '')
          panel.appendChild(mount)
        }
        setPortalTarget(mount)
      } else {
        setPortalTarget(null)
      }
    }

    find()
    // Re-check when Excalidraw re-mounts panels
    const observer = new MutationObserver(find)
    observer.observe(containerRef.current, { childList: true, subtree: true })
    return () => observer.disconnect()
  }, [containerRef])

  // Poll selected elements (onChange doesn't always fire for selection-only changes)
  const checkSelection = useCallback(() => {
    if (!api) { setSelectedTextId(null); return }
    const appState = api.getAppState()
    const selectedIds = Object.keys(appState.selectedElementIds || {})
    if (selectedIds.length !== 1) { setSelectedTextId(null); return }

    const elements = api.getSceneElements()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const el = elements.find((e: any) => e.id === selectedIds[0]) as any
    if (el?.type === 'text' && !el.isDeleted) {
      setSelectedTextId(el.id)
      setListType(detectListType(el.text ?? el.originalText ?? ''))
    } else {
      setSelectedTextId(null)
    }
  }, [api])

  useEffect(() => {
    pollRef.current = window.setInterval(checkSelection, 300)
    return () => clearInterval(pollRef.current)
  }, [checkSelection])

  const applyList = useCallback(
    (type: ListType) => {
      if (!api || !selectedTextId) return
      const elements = api.getSceneElements()
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const el = elements.find((e: any) => e.id === selectedTextId) as any
      if (!el || el.type !== 'text') return

      const currentText: string = el.originalText ?? el.text ?? ''
      const current = detectListType(currentText)

      let newText: string
      if (current === type) {
        // Toggle off
        newText = removeListFormatting(currentText)
        setListType('none')
      } else {
        newText = type === 'bullet' ? toBulletList(currentText) : toNumberedList(currentText)
        setListType(type)
      }

      // Update the element via updateScene
      const updated = elements.map((e) => {
        if (e.id !== selectedTextId) return e
        return {
          ...e,
          text: newText,
          originalText: newText,
          version: (e.version ?? 1) + 1,
          versionNonce: Math.floor(Math.random() * 1_000_000_000),
        }
      })
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      api.updateScene({ elements: updated as any })
    },
    [api, selectedTextId],
  )

  if (!selectedTextId || !portalTarget) return null

  return createPortal(
    <fieldset
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 4,
        padding: '8px 0',
        borderTop: '1px solid var(--default-border-color, #e4e4e7)',
        margin: '0',
        border: 'none',
        borderTopStyle: 'solid',
        borderTopWidth: 1,
        borderTopColor: 'var(--default-border-color, #e4e4e7)',
      }}
    >
      <legend
        style={{
          fontSize: '0.75rem',
          fontWeight: 700,
          color: 'var(--text-primary-color, #1e1e1e)',
          textTransform: 'uppercase' as const,
          letterSpacing: '0.04em',
          padding: '0 4px 4px',
          fontFamily: 'Assistant, system-ui, sans-serif',
        }}
      >
        List
      </legend>
      <div style={{ display: 'flex', gap: 4, padding: '0 4px' }}>
        <button
          type="button"
          title="Bullet list"
          onClick={() => applyList('bullet')}
          style={{
            flex: 1,
            height: 32,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: 'var(--border-radius-md, 8px)',
            border: '1px solid var(--default-border-color, #e4e4e7)',
            background: listType === 'bullet'
              ? 'var(--color-primary-light, #e0e7ff)'
              : 'var(--island-bg-color, #fff)',
            color: 'var(--text-primary-color, #1e1e1e)',
            cursor: 'pointer',
            fontSize: 16,
            fontFamily: 'system-ui, sans-serif',
            padding: 0,
          }}
        >
          <BulletListIcon active={listType === 'bullet'} />
        </button>
        <button
          type="button"
          title="Numbered list"
          onClick={() => applyList('numbered')}
          style={{
            flex: 1,
            height: 32,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: 'var(--border-radius-md, 8px)',
            border: '1px solid var(--default-border-color, #e4e4e7)',
            background: listType === 'numbered'
              ? 'var(--color-primary-light, #e0e7ff)'
              : 'var(--island-bg-color, #fff)',
            color: 'var(--text-primary-color, #1e1e1e)',
            cursor: 'pointer',
            fontSize: 16,
            fontFamily: 'system-ui, sans-serif',
            padding: 0,
          }}
        >
          <NumberedListIcon active={listType === 'numbered'} />
        </button>
      </div>
    </fieldset>,
    portalTarget,
  )
}

function BulletListIcon({ active }: { active: boolean }) {
  const color = active ? 'var(--color-primary, #4f46e5)' : 'currentColor'
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="4" cy="6" r="1.5" fill={color} stroke="none" />
      <circle cx="4" cy="12" r="1.5" fill={color} stroke="none" />
      <circle cx="4" cy="18" r="1.5" fill={color} stroke="none" />
      <line x1="9" y1="6" x2="21" y2="6" />
      <line x1="9" y1="12" x2="21" y2="12" />
      <line x1="9" y1="18" x2="21" y2="18" />
    </svg>
  )
}

function NumberedListIcon({ active }: { active: boolean }) {
  const color = active ? 'var(--color-primary, #4f46e5)' : 'currentColor'
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <text x="2" y="8" fontSize="8" fontWeight="bold" fill={color} stroke="none" fontFamily="system-ui">1</text>
      <text x="2" y="14.5" fontSize="8" fontWeight="bold" fill={color} stroke="none" fontFamily="system-ui">2</text>
      <text x="2" y="21" fontSize="8" fontWeight="bold" fill={color} stroke="none" fontFamily="system-ui">3</text>
      <line x1="10" y1="6" x2="21" y2="6" />
      <line x1="10" y1="12" x2="21" y2="12" />
      <line x1="10" y1="18" x2="21" y2="18" />
    </svg>
  )
}

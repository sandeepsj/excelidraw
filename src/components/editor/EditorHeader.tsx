'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { AutoSaveIndicator } from './AutoSaveIndicator'
import { updateDiagram } from '@/lib/firebase/firestore'
import { ArrowLeft, Share2, Check } from 'lucide-react'

type SaveStatus = 'saved' | 'saving' | 'unsaved'

interface EditorHeaderProps {
  diagramId: string
  title: string
  saveStatus: SaveStatus
}

export function EditorHeader({ diagramId, title, saveStatus }: EditorHeaderProps) {
  const router = useRouter()
  const [editingTitle, setEditingTitle] = useState(false)
  const [localTitle, setLocalTitle] = useState(title)
  const [copied, setCopied] = useState(false)

  const handleTitleBlur = async () => {
    setEditingTitle(false)
    if (localTitle !== title && localTitle.trim()) {
      await updateDiagram(diagramId, { title: localTitle.trim() })
    }
  }

  const handleShare = async () => {
    const url = `${window.location.origin}/diagram/${diagramId}/view`
    await navigator.clipboard.writeText(url)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <header className="flex items-center gap-3 px-4 h-12 border-b bg-background z-10">
      <Button
        size="sm"
        variant="ghost"
        className="h-8 px-2"
        onClick={() => router.push('/dashboard')}
      >
        <ArrowLeft className="h-4 w-4" />
      </Button>

      {editingTitle ? (
        <Input
          value={localTitle}
          onChange={(e) => setLocalTitle(e.target.value)}
          onBlur={handleTitleBlur}
          onKeyDown={(e) => e.key === 'Enter' && handleTitleBlur()}
          className="h-7 text-sm font-medium max-w-xs"
          autoFocus
        />
      ) : (
        <button
          className="text-sm font-medium hover:underline underline-offset-2 max-w-xs truncate"
          onClick={() => setEditingTitle(true)}
        >
          {localTitle}
        </button>
      )}

      <AutoSaveIndicator status={saveStatus} />

      <div className="ml-auto">
        <Button size="sm" variant="outline" className="h-8 gap-1.5" onClick={handleShare}>
          {copied ? (
            <>
              <Check className="h-3.5 w-3.5" /> Copied
            </>
          ) : (
            <>
              <Share2 className="h-3.5 w-3.5" /> Share
            </>
          )}
        </Button>
      </div>
    </header>
  )
}

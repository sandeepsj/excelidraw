'use client'

export const dynamic = 'force-dynamic'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/hooks/useAuth'
import { createDiagram } from '@/lib/firebase/firestore'
import { uploadScene, getSceneStorageRef } from '@/lib/firebase/storage'

export default function NewDiagramPage() {
  const { user, loading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (loading) return
    if (!user) {
      router.replace('/login')
      return
    }

    const create = async () => {
      const id = await createDiagram({
        title: 'Untitled diagram',
        ownerId: user.uid,
        ownerEmail: user.email ?? '',
        ownerName: user.displayName ?? '',
        pinned: false,
        isPublic: true,
        thumbnailUrl: null,
        storageRef: '', // will be set below
      })

      const storageRef = getSceneStorageRef(id)
      await uploadScene(id, JSON.stringify({ elements: [], appState: {}, files: {} }))

      // update storageRef in the doc
      const { updateDiagram } = await import('@/lib/firebase/firestore')
      await updateDiagram(id, { storageRef })

      router.replace(`/diagram/${id}/edit`)
    }

    create()
  }, [user, loading, router])

  return (
    <div className="min-h-screen flex items-center justify-center">
      <p className="text-muted-foreground text-sm">Creating diagram…</p>
    </div>
  )
}

import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/lib/hooks/useAuth'
import { createDiagram } from '@/lib/drive/diagrams'

export default function NewDiagramPage() {
  const { user, driveToken } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    if (!user || !driveToken) return

    const create = async () => {
      const id = await createDiagram(driveToken, user, {
        title: 'Untitled diagram',
        pinned: false,
        isPublic: false,
      })
      navigate(`/diagram/${id}/edit`, { replace: true })
    }

    create()
  }, [user, driveToken, navigate])

  return (
    <div className="min-h-screen flex items-center justify-center">
      <p className="text-muted-foreground text-sm">Creating diagram…</p>
    </div>
  )
}

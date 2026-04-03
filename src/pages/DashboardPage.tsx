import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/lib/hooks/useAuth'
import { useDiagrams } from '@/lib/hooks/useDiagrams'
import { DiagramGrid } from '@/components/dashboard/DiagramGrid'
import { SearchBar } from '@/components/dashboard/SearchBar'
import { Button } from '@/components/ui/button'
import { Plus, LogOut } from 'lucide-react'

export default function DashboardPage() {
  const { user, driveToken, signOut } = useAuth()
  const navigate = useNavigate()
  const { diagrams, loading, refresh } = useDiagrams(user?.uid ?? null, driveToken)
  const [search, setSearch] = useState('')

  const filtered = useMemo(
    () =>
      search.trim()
        ? diagrams.filter((d) => d.title.toLowerCase().includes(search.toLowerCase()))
        : diagrams,
    [diagrams, search]
  )

  const pinned = filtered.filter((d) => d.pinned)
  const rest = filtered.filter((d) => !d.pinned)

  if (!driveToken) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-3">
          <p className="text-muted-foreground">Drive access lost. Please sign in again.</p>
          <Button size="sm" onClick={signOut}>Sign in again</Button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b px-6 h-14 flex items-center gap-4">
        <h1 className="text-lg font-semibold">Excelidraw</h1>
        <div className="flex-1 max-w-sm">
          <SearchBar value={search} onChange={setSearch} />
        </div>
        <div className="ml-auto flex items-center gap-2">
          <Button size="sm" onClick={() => navigate('/diagram/new')} className="gap-1.5">
            <Plus className="h-4 w-4" />
            New
          </Button>
          <Button size="sm" variant="ghost" onClick={signOut}>
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </header>

      <main className="px-6 py-8 max-w-7xl mx-auto space-y-8">
        {pinned.length > 0 && (
          <section>
            <h2 className="text-sm font-medium text-muted-foreground mb-3">Pinned</h2>
            <DiagramGrid diagrams={pinned} loading={false} driveToken={driveToken} onRefresh={refresh} />
          </section>
        )}
        <section>
          {pinned.length > 0 && (
            <h2 className="text-sm font-medium text-muted-foreground mb-3">All diagrams</h2>
          )}
          <DiagramGrid diagrams={rest} loading={loading} driveToken={driveToken} onRefresh={refresh} />
        </section>
      </main>
    </div>
  )
}

import type { AppUser } from '@/types/user'
import {
  driveListFiles,
  driveGetContent,
  driveCreateFile,
  driveUpdateContent,
  driveUpdateProperties,
  driveDeleteFile,
  driveListRevisions,
  driveGetRevisionContent,
  DriveAuthError,
  type DriveFileMeta,
} from './client'
import { getOrCreateFolder, migrateFilesToFolder } from './folder'
import type { Diagram, DiagramCreate } from '@/types/diagram'

let migrationDone = false

function fileToDiagram(file: DriveFileMeta): Diagram {
  const p = file.properties ?? {}
  return {
    id: file.id,
    title: p.title ?? 'Untitled diagram',
    ownerId: p.ownerId ?? '',
    ownerEmail: p.ownerEmail ?? '',
    ownerName: p.ownerName ?? '',
    createdAt: p.createdAt ?? file.createdTime,
    updatedAt: file.modifiedTime,
    pinned: p.pinned === 'true',
    isPublic: p.isPublic === 'true',
    thumbnailUrl: null,
    driveUrl: file.webViewLink ?? null,
  }
}

export async function listDiagrams(token: string): Promise<Diagram[]> {
  const folderId = await getOrCreateFolder(token)

  // Migrate existing root-level files into the folder (once per session)
  if (!migrationDone) {
    migrationDone = true
    try {
      await migrateFilesToFolder(token, folderId)
    } catch {
      // Non-critical — files still work from root, migration will retry next session
    }
  }

  const files = await driveListFiles(token, folderId)
  const diagrams = files.map(fileToDiagram)
  // Sort: pinned first, then by updatedAt desc
  return diagrams.sort((a, b) => {
    if (a.pinned !== b.pinned) return a.pinned ? -1 : 1
    return b.updatedAt.localeCompare(a.updatedAt)
  })
}

export async function createDiagram(
  token: string,
  user: AppUser,
  fields: DiagramCreate
): Promise<string> {
  const folderId = await getOrCreateFolder(token)
  const id = crypto.randomUUID()
  const now = new Date().toISOString()
  const file = await driveCreateFile(
    token,
    `${id}.json`,
    {
      title: fields.title,
      pinned: String(fields.pinned),
      isPublic: String(fields.isPublic),
      createdAt: now,
      ownerId: user.uid,  // AppUser.uid = NextAuth session.user.id (Google sub)
      ownerEmail: user.email,
      ownerName: user.displayName,
    },
    JSON.stringify({ elements: [], appState: {}, files: {} }),
    folderId
  )
  return file.id
}

export async function getDiagramScene(token: string, fileId: string): Promise<string> {
  return driveGetContent(fileId, token)
}

export async function updateDiagramScene(
  token: string,
  fileId: string,
  sceneJson: string
): Promise<void> {
  return driveUpdateContent(fileId, token, sceneJson)
}

export async function updateDiagramMetadata(
  token: string,
  fileId: string,
  fields: Partial<Pick<Diagram, 'title' | 'pinned' | 'isPublic'>>
): Promise<void> {
  const props: Record<string, string> = {}
  if (fields.title !== undefined) props.title = fields.title
  if (fields.pinned !== undefined) props.pinned = String(fields.pinned)
  if (fields.isPublic !== undefined) props.isPublic = String(fields.isPublic)
  return driveUpdateProperties(fileId, token, props)
}

export async function deleteDiagram(token: string, fileId: string): Promise<void> {
  return driveDeleteFile(fileId, token)
}

/** Duplicate a diagram into a new Drive file (replaces server-side fork) */
export async function duplicateDiagram(
  token: string,
  fileId: string,
  user: AppUser
): Promise<string> {
  const folderId = await getOrCreateFolder(token)
  const scene = await getDiagramScene(token, fileId)
  const now = new Date().toISOString()
  const newId = crypto.randomUUID()
  const file = await driveCreateFile(
    token,
    `${newId}.json`,
    {
      title: 'Copy',
      pinned: 'false',
      isPublic: 'false',
      createdAt: now,
      ownerId: user.uid,  // AppUser.uid = NextAuth session.user.id (Google sub)
      ownerEmail: user.email,
      ownerName: user.displayName,
    },
    scene,
    folderId
  )
  return file.id
}

/** Fetch a single diagram's metadata from Drive (for edit/view page load) */
export async function getDiagramMetadata(
  token: string,
  fileId: string
): Promise<Diagram | null> {
  try {
    const res = await fetch(
      `https://www.googleapis.com/drive/v3/files/${fileId}?fields=id,name,properties,modifiedTime,createdTime,webViewLink`,
      { headers: { Authorization: `Bearer ${token}` } }
    )
    if (res.status === 404) return null
    if (res.status === 401 || res.status === 403) {
      throw new DriveAuthError()
    }
    if (!res.ok) return null
    const file: DriveFileMeta = await res.json()
    return fileToDiagram(file)
  } catch (err) {
    // Re-throw DriveAuthError so callers can handle token refresh
    if ((err as Error).name === 'DriveAuthError') throw err
    return null
  }
}

/**
 * Restore a diagram from its Drive version history.
 * Walks revisions (most recent first) and restores the first one
 * that has actual content (elements.length > 0).
 * Returns true if restored, false if no valid revision found.
 */
export async function restoreDiagramFromHistory(
  token: string,
  fileId: string
): Promise<boolean> {
  const revisions = await driveListRevisions(fileId, token)

  for (const rev of revisions) {
    try {
      const content = await driveGetRevisionContent(fileId, rev.id, token)
      const parsed = JSON.parse(content)
      if (parsed.elements && parsed.elements.length > 0) {
        await driveUpdateContent(fileId, token, content)
        return true
      }
    } catch {
      continue
    }
  }
  return false
}

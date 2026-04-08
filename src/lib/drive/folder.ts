import { DriveAuthError } from './client'

const DRIVE_API = 'https://www.googleapis.com/drive/v3'
const FOLDER_NAME = 'Excelidraw'

let cachedFolderId: string | null = null

/**
 * Find or create the "Excelidraw" folder in the user's Drive root.
 * Caches the result in memory so we only look it up once per session.
 */
export async function getOrCreateFolder(token: string): Promise<string> {
  if (cachedFolderId) return cachedFolderId

  // Search for an existing folder named "Excelidraw" in root
  const q = `name='${FOLDER_NAME}' and mimeType='application/vnd.google-apps.folder' and 'root' in parents and trashed=false`
  const searchUrl = `${DRIVE_API}/files?q=${encodeURIComponent(q)}&fields=files(id)&pageSize=1`
  const searchRes = await fetch(searchUrl, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (searchRes.status === 401 || searchRes.status === 403) throw new DriveAuthError()
  if (!searchRes.ok) throw new Error(`Drive API error ${searchRes.status}: ${await searchRes.text()}`)

  const { files } = await searchRes.json()
  if (files && files.length > 0) {
    cachedFolderId = files[0].id as string
    return cachedFolderId
  }

  // Create the folder
  const createRes = await fetch(`${DRIVE_API}/files`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      name: FOLDER_NAME,
      mimeType: 'application/vnd.google-apps.folder',
      parents: ['root'],
    }),
  })
  if (createRes.status === 401 || createRes.status === 403) throw new DriveAuthError()
  if (!createRes.ok) throw new Error(`Drive API error ${createRes.status}: ${await createRes.text()}`)

  const folder = await createRes.json()
  cachedFolderId = folder.id as string
  return cachedFolderId
}

// Excelidraw files are named as UUID.json (e.g. "a010d4c2-f8f6-4912-ad5b-1c6ecb45511e.json")
const UUID_JSON_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.json$/

/**
 * Move Excelidraw files from root into the Excelidraw folder.
 * Only moves files matching the UUID.json naming pattern to avoid
 * touching files from other apps that also use drive.file scope.
 */
export async function migrateFilesToFolder(token: string, folderId: string): Promise<void> {
  const q = `'root' in parents and mimeType!='application/vnd.google-apps.folder' and trashed=false`
  const fields = 'files(id,name)'
  const url = `${DRIVE_API}/files?q=${encodeURIComponent(q)}&fields=${encodeURIComponent(fields)}&pageSize=1000`
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (res.status === 401 || res.status === 403) throw new DriveAuthError()
  if (!res.ok) return // non-critical, skip migration silently

  const { files } = await res.json()
  if (!files || files.length === 0) return

  // Only move files that match Excelidraw's UUID.json naming convention
  const moves = (files as Array<{ id: string; name: string }>)
    .filter((f) => UUID_JSON_RE.test(f.name))
    .map((f) =>
      fetch(`${DRIVE_API}/files/${f.id}?addParents=${folderId}&removeParents=root`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}` },
      })
    )

  await Promise.all(moves)
}

/** Reset the cached folder ID (e.g. on sign-out) */
export function clearFolderCache() {
  cachedFolderId = null
}

const DRIVE_API = 'https://www.googleapis.com/drive/v3'
const DRIVE_UPLOAD_API = 'https://www.googleapis.com/upload/drive/v3'

export class DriveAuthError extends Error {
  constructor() {
    super('Drive token expired or invalid')
    this.name = 'DriveAuthError'
  }
}

async function checkResponse(res: Response): Promise<Response> {
  if (res.status === 401 || res.status === 403) throw new DriveAuthError()
  if (!res.ok) throw new Error(`Drive API error ${res.status}: ${await res.text()}`)
  return res
}

export interface DriveFileProperties {
  title?: string
  pinned?: string        // "true" | "false"
  isPublic?: string      // "true" | "false"
  createdAt?: string     // ISO string
  ownerId?: string
  ownerEmail?: string
  ownerName?: string
}

export interface DriveFileMeta {
  id: string
  name: string
  properties: DriveFileProperties
  modifiedTime: string   // ISO string
  createdTime: string    // ISO string
}

/** List all diagram files in appDataFolder */
export async function driveListFiles(token: string): Promise<DriveFileMeta[]> {
  const fields = 'files(id,name,properties,modifiedTime,createdTime)'
  const url = `${DRIVE_API}/files?spaces=appDataFolder&fields=${encodeURIComponent(fields)}&orderBy=modifiedTime+desc&pageSize=1000`
  const res = await checkResponse(
    await fetch(url, { headers: { Authorization: `Bearer ${token}` } })
  )
  const json = await res.json()
  // Only return files that look like diagrams (name ends in .json)
  return (json.files as DriveFileMeta[]).filter((f) => f.name.endsWith('.json'))
}

/** Download raw file content as a string */
export async function driveGetContent(fileId: string, token: string): Promise<string> {
  const url = `${DRIVE_API}/files/${fileId}?alt=media`
  const res = await checkResponse(
    await fetch(url, { headers: { Authorization: `Bearer ${token}` } })
  )
  return res.text()
}

/** Create a new file in appDataFolder with properties + text content (multipart) */
export async function driveCreateFile(
  token: string,
  name: string,
  properties: DriveFileProperties,
  content: string
): Promise<DriveFileMeta> {
  const boundary = 'excelidraw_boundary'
  const metadata = JSON.stringify({ name, parents: ['appDataFolder'], properties })

  const body = [
    `--${boundary}`,
    'Content-Type: application/json; charset=UTF-8',
    '',
    metadata,
    `--${boundary}`,
    'Content-Type: application/json',
    '',
    content,
    `--${boundary}--`,
  ].join('\r\n')

  const url = `${DRIVE_UPLOAD_API}/files?uploadType=multipart&fields=id,name,properties,modifiedTime,createdTime`
  const res = await checkResponse(
    await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': `multipart/related; boundary=${boundary}`,
      },
      body,
    })
  )
  return res.json()
}

/** Update only the file's media content (scene JSON) */
export async function driveUpdateContent(
  fileId: string,
  token: string,
  content: string
): Promise<void> {
  const url = `${DRIVE_UPLOAD_API}/files/${fileId}?uploadType=media`
  await checkResponse(
    await fetch(url, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: content,
    })
  )
}

/** Update only the file's properties (title, pinned, isPublic) */
export async function driveUpdateProperties(
  fileId: string,
  token: string,
  properties: Partial<DriveFileProperties>
): Promise<void> {
  const url = `${DRIVE_API}/files/${fileId}`
  await checkResponse(
    await fetch(url, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ properties }),
    })
  )
}

/** Delete a file permanently */
export async function driveDeleteFile(fileId: string, token: string): Promise<void> {
  const url = `${DRIVE_API}/files/${fileId}`
  const res = await fetch(url, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  })
  if (res.status === 404) return // already gone
  if (res.status === 401 || res.status === 403) throw new DriveAuthError()
  if (!res.ok) throw new Error(`Drive delete error ${res.status}`)
}

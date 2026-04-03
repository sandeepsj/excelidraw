export interface Diagram {
  id: string           // Google Drive file ID
  title: string
  ownerId: string      // Firebase UID (stored as Drive file property)
  ownerEmail: string
  ownerName: string
  createdAt: string    // ISO string (stored as Drive file property)
  updatedAt: string    // ISO string (Drive modifiedTime)
  pinned: boolean
  isPublic: boolean
  thumbnailUrl: null   // Not supported; appDataFolder files have no public URL
}

export type DiagramCreate = Pick<Diagram, 'title' | 'pinned' | 'isPublic'>

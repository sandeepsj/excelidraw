import { Timestamp } from 'firebase/firestore'

export interface Diagram {
  id: string
  title: string
  ownerId: string
  ownerEmail: string
  ownerName: string
  createdAt: Timestamp
  updatedAt: Timestamp
  pinned: boolean
  isPublic: boolean
  thumbnailUrl: string | null
  storageRef: string
}

export type DiagramCreate = Omit<Diagram, 'id' | 'createdAt' | 'updatedAt'> & {
  createdAt?: Timestamp
  updatedAt?: Timestamp
}

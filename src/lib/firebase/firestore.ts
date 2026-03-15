import {
  getFirestore,
  collection,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  onSnapshot,
  serverTimestamp,
} from 'firebase/firestore'
import { getFirebaseApp } from './client'
import type { Diagram, DiagramCreate } from '@/types/diagram'

function getDb() {
  return getFirestore(getFirebaseApp())
}

export async function createDiagram(data: DiagramCreate): Promise<string> {
  const db = getDb()
  const ref = doc(collection(db, 'diagrams'))
  await setDoc(ref, {
    ...data,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  })
  return ref.id
}

export async function getDiagram(id: string): Promise<Diagram | null> {
  const ref = doc(getDb(), 'diagrams', id)
  const snap = await getDoc(ref)
  if (!snap.exists()) return null
  return { id: snap.id, ...snap.data() } as Diagram
}

export async function updateDiagram(id: string, data: Partial<Diagram>) {
  const ref = doc(getDb(), 'diagrams', id)
  await updateDoc(ref, { ...data, updatedAt: serverTimestamp() })
}

export async function deleteDiagram(id: string) {
  await deleteDoc(doc(getDb(), 'diagrams', id))
}

export function listenUserDiagrams(
  userId: string,
  callback: (diagrams: Diagram[]) => void
) {
  // Requires composite index: ownerId ASC, pinned DESC, updatedAt DESC
  const q = query(
    collection(getDb(), 'diagrams'),
    where('ownerId', '==', userId),
    orderBy('pinned', 'desc'),
    orderBy('updatedAt', 'desc')
  )
  return onSnapshot(q, (snapshot) => {
    const diagrams = snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as Diagram))
    callback(diagrams)
  })
}

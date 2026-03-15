import {
  getStorage,
  ref,
  uploadString,
  getDownloadURL,
  uploadBytes,
  getBytes,
} from 'firebase/storage'
import { getFirebaseApp } from './client'

function getFirebaseStorage() {
  return getStorage(getFirebaseApp())
}

export async function uploadScene(diagramId: string, sceneJson: string): Promise<void> {
  const storageRef = ref(getFirebaseStorage(), `diagrams/${diagramId}/scene.json`)
  await uploadString(storageRef, sceneJson, 'raw', {
    contentType: 'application/json',
  })
}

export async function downloadScene(diagramId: string): Promise<string> {
  const storageRef = ref(getFirebaseStorage(), `diagrams/${diagramId}/scene.json`)
  const bytes = await getBytes(storageRef)
  return new TextDecoder().decode(bytes)
}

export async function uploadThumbnail(diagramId: string, blob: Blob): Promise<string> {
  const storageRef = ref(getFirebaseStorage(), `diagrams/${diagramId}/thumbnail.png`)
  await uploadBytes(storageRef, blob, { contentType: 'image/png' })
  return getDownloadURL(storageRef)
}

export function getSceneStorageRef(diagramId: string): string {
  return `diagrams/${diagramId}/scene.json`
}

import { NextRequest, NextResponse } from 'next/server'
import { adminAuth, adminDb, adminStorage } from '@/lib/firebase/admin'
import { FieldValue } from 'firebase-admin/firestore'

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  // Verify auth token
  const authHeader = req.headers.get('Authorization')
  if (!authHeader?.startsWith('Bearer ')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const token = authHeader.slice(7)

  let decodedToken
  try {
    decodedToken = await adminAuth().verifyIdToken(token)
  } catch {
    return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
  }

  const { uid, email, name } = decodedToken

  // Get source diagram metadata
  const sourceRef = adminDb().collection('diagrams').doc(id)
  const sourceSnap = await sourceRef.get()
  if (!sourceSnap.exists) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const source = sourceSnap.data()!
  if (!source.isPublic && source.ownerId !== uid) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  // Read source scene
  const bucket = adminStorage().bucket()
  const [sceneContents] = await bucket.file(`diagrams/${id}/scene.json`).download()
  const sceneJson = sceneContents.toString('utf-8')

  // Create new diagram doc
  const newRef = adminDb().collection('diagrams').doc()
  const newId = newRef.id

  await newRef.set({
    title: `${source.title} (fork)`,
    ownerId: uid,
    ownerEmail: email ?? '',
    ownerName: name ?? '',
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
    pinned: false,
    isPublic: true,
    thumbnailUrl: source.thumbnailUrl ?? null,
    storageRef: `diagrams/${newId}/scene.json`,
  })

  // Copy scene to new storage path
  await bucket.file(`diagrams/${newId}/scene.json`).save(sceneJson, {
    contentType: 'application/json',
  })

  return NextResponse.json({ newId })
}

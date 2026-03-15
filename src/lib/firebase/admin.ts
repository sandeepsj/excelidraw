import { initializeApp, getApps, cert, App } from 'firebase-admin/app'
import { getAuth } from 'firebase-admin/auth'
import { getFirestore } from 'firebase-admin/firestore'
import { getStorage } from 'firebase-admin/storage'

let adminApp: App

function getAdminApp(): App {
  if (!adminApp) {
    const existingApps = getApps()
    if (existingApps.length > 0) {
      adminApp = existingApps[0]
    } else {
      const serviceAccountJson = Buffer.from(
        process.env.FIREBASE_SERVICE_ACCOUNT_JSON!,
        'base64'
      ).toString('utf-8')
      const serviceAccount = JSON.parse(serviceAccountJson)

      adminApp = initializeApp({
        credential: cert(serviceAccount),
        storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
      })
    }
  }
  return adminApp
}

export function adminAuth() {
  return getAuth(getAdminApp())
}

export function adminDb() {
  return getFirestore(getAdminApp())
}

export function adminStorage() {
  return getStorage(getAdminApp())
}

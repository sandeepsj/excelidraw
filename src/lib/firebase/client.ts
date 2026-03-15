import { initializeApp, getApps, getApp, type FirebaseApp } from 'firebase/app'

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
}

let _app: FirebaseApp | null = null

export function getFirebaseApp(): FirebaseApp {
  if (_app) return _app
  _app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp()
  return _app
}

// For convenience in client-only code
export const firebaseApp = new Proxy({} as FirebaseApp, {
  get(_target, prop) {
    return Reflect.get(getFirebaseApp(), prop)
  },
})

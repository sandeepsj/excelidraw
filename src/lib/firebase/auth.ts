import { getAuth, GoogleAuthProvider, signInWithPopup, signOut as firebaseSignOut } from 'firebase/auth'
import { getFirebaseApp } from './client'

// Lazy getter — NOT called at module load, only when invoked at runtime
export function getFirebaseAuth() {
  return getAuth(getFirebaseApp())
}

export async function signInWithGoogle() {
  return signInWithPopup(getFirebaseAuth(), new GoogleAuthProvider())
}

export async function signOut() {
  return firebaseSignOut(getFirebaseAuth())
}

import { initializeApp, getApps } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signInAnonymously,
  signOut,
  User,
} from 'firebase/auth';
import { getFirestore, doc, getDocFromServer } from 'firebase/firestore';
import { getStorage, ref, uploadString, getDownloadURL } from 'firebase/storage';
import defaultFirebaseConfig from '../../firebase-applet-config.json';

export const firebaseConfig = {
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || defaultFirebaseConfig.projectId,
  appId: import.meta.env.VITE_FIREBASE_APP_ID || defaultFirebaseConfig.appId,
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || defaultFirebaseConfig.apiKey,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || defaultFirebaseConfig.authDomain,
  firestoreDatabaseId:
    import.meta.env.VITE_FIREBASE_DATABASE_ID || defaultFirebaseConfig.firestoreDatabaseId,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || defaultFirebaseConfig.storageBucket,
  messagingSenderId:
    import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || defaultFirebaseConfig.messagingSenderId,
};

const app = getApps().length > 0 ? getApps()[0] : initializeApp(firebaseConfig);
export const db = firebaseConfig.firestoreDatabaseId
  ? getFirestore(app, firebaseConfig.firestoreDatabaseId)
  : getFirestore(app);
export const auth = getAuth(app);
export const storage = getStorage(app);
export const googleProvider = new GoogleAuthProvider();

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(
  error: unknown,
  operationType: OperationType,
  path: string | null
) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo:
        auth.currentUser?.providerData?.map((provider) => ({
          providerId: provider.providerId,
          email: provider.email,
        })) || [],
    },
    operationType,
    path,
  };
  console.warn('Firestore warning:', JSON.stringify(errInfo));
  throw new Error(errInfo.error);
}

let anonymousAuthAttempted = false;

/**
 * Safely attempts Firebase anonymous sign-in when no Firebase session exists yet
 * so Firestore rules checking request.auth != null work seamlessly when enabled.
 */
export async function ensureFirebaseAuthSession(): Promise<User | null> {
  if (auth.currentUser) return auth.currentUser;
  if (anonymousAuthAttempted) return null;
  anonymousAuthAttempted = true;
  try {
    const cred = await signInAnonymously(auth);
    return cred.user;
  } catch {
    // Anonymous auth may be disabled in Firebase Console; fall back silently
    return null;
  }
}

export async function signInWithGoogleForCloudSync(): Promise<User | null> {
  const cred = await signInWithPopup(auth, googleProvider);
  return cred.user;
}

export async function signOutFirebase(): Promise<void> {
  await signOut(auth);
}

/**
 * Uploads a compressed base64 data URL image to Firebase Storage if enabled.
 * Returns null if upload fails (e.g. Storage rules/CORS) so caller can use fallback.
 */
export async function uploadDataUrlToFirebaseStorage(
  dataUrl: string,
  folder = 'cropsa-images',
  prefix = 'img'
): Promise<string | null> {
  if (!dataUrl || !dataUrl.startsWith('data:image/')) return null;
  try {
    await ensureFirebaseAuthSession();
    const safePrefix = prefix.replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 24) || 'img';
    const fileName = `${folder}/${safePrefix}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}.jpg`;
    const storageRef = ref(storage, fileName);
    await Promise.race([
      uploadString(storageRef, dataUrl, 'data_url'),
      new Promise((_, reject) => setTimeout(() => reject(new Error('Storage timeout')), 8000)),
    ]);
    return await getDownloadURL(storageRef);
  } catch {
    return null;
  }
}

export async function testConnection(): Promise<boolean> {
  try {
    await getDocFromServer(doc(db, 'settings', 'main'));
    return true;
  } catch {
    return false;
  }
}

import { initializeApp } from 'firebase/app';
import { getAnalytics, isSupported, type Analytics } from 'firebase/analytics';
import { getAuth, GoogleAuthProvider, OAuthProvider } from 'firebase/auth';
import { initializeFirestore } from 'firebase/firestore';
import { getFunctions } from 'firebase/functions';
import { getStorage } from 'firebase/storage';
import firebaseConfig from '../firebase-applet-config.json';

const localAuthDomainFromEnv = (import.meta.env.VITE_FIREBASE_AUTH_DOMAIN_LOCAL || '').trim();
const envMeasurementId = (import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || '').trim();
const envPrimaryFirestoreDatabaseId = (
  import.meta.env.VITE_FIRESTORE_PRIMARY_DATABASE_ID ||
  import.meta.env.VITE_FIRESTORE_DATABASE_ID ||
  ''
).trim();
const envEphemeralFirestoreDatabaseId = (
  import.meta.env.VITE_FIRESTORE_EPHEMERAL_DATABASE_ID ||
  ''
).trim();
const isLocalHost =
  typeof window !== 'undefined' &&
  (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');
const defaultLocalAuthDomain = firebaseConfig.projectId
  ? `${firebaseConfig.projectId}.firebaseapp.com`
  : firebaseConfig.authDomain;
const localAuthDomain = localAuthDomainFromEnv || defaultLocalAuthDomain;

const resolvedFirebaseConfig = {
  ...firebaseConfig,
  measurementId: envMeasurementId || firebaseConfig.measurementId || undefined,
  authDomain: isLocalHost ? localAuthDomain : firebaseConfig.authDomain
};

export const app = initializeApp(resolvedFirebaseConfig);
export const auth = getAuth(app);
export const firebaseProjectId = resolvedFirebaseConfig.projectId;
export const firestoreDatabaseId = envPrimaryFirestoreDatabaseId || firebaseConfig.firestoreDatabaseId;
export const ephemeralFirestoreDatabaseId = envEphemeralFirestoreDatabaseId || firebaseConfig.firestoreDatabaseId;
const firestoreSettings = {
  experimentalAutoDetectLongPolling: true,
  useFetchStreams: false
};
export const db = initializeFirestore(
  app,
  firestoreSettings,
  firestoreDatabaseId
);
export const sharedDb = ephemeralFirestoreDatabaseId === firestoreDatabaseId
  ? db
  : initializeFirestore(
    app,
    firestoreSettings,
    ephemeralFirestoreDatabaseId
  );
export const activeDraftDb = sharedDb;
export const leaderboardDb = sharedDb;
export const functions = getFunctions(app, 'asia-southeast1');
export const storage = getStorage(app);
export const googleProvider = new GoogleAuthProvider();
export const appleProvider = new OAuthProvider('apple.com');

appleProvider.addScope('email');
appleProvider.addScope('name');

export const analyticsPromise: Promise<Analytics | null> = (async () => {
  if (typeof window === 'undefined') return null;
  if (!resolvedFirebaseConfig.measurementId) return null;
  try {
    const supported = await isSupported();
    if (!supported) return null;
    return getAnalytics(app);
  } catch {
    return null;
  }
})();

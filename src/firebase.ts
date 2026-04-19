import { initializeApp } from 'firebase/app';
import { getAnalytics, isSupported, type Analytics } from 'firebase/analytics';
import { getAuth, GoogleAuthProvider, OAuthProvider } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import firebaseConfig from '../firebase-applet-config.json';

const localAuthDomainFromEnv = (import.meta.env.VITE_FIREBASE_AUTH_DOMAIN_LOCAL || '').trim();
const envMeasurementId = (import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || '').trim();
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
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
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

import { initializeApp, getApps, deleteApp } from 'firebase/app';
import { getFirestore, initializeFirestore, doc, getDoc, setDoc, onSnapshot } from 'firebase/firestore';
import { DatabaseState } from '../types';

export interface FirebaseCustomConfig {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket: string;
  messagingSenderId: string;
  appId: string;
}

// Get config from localStorage first, or fallback to static Vite import.meta.env
export function getFirebaseConfig(): FirebaseCustomConfig {
  try {
    const saved = localStorage.getItem('vanguard_firebase_config');
    if (saved) {
      const parsed = JSON.parse(saved);
      if (parsed.apiKey && parsed.projectId) {
        return parsed;
      }
    }
  } catch (e) {
    console.warn('Erro ao ler configuração do localStorage:', e);
  }

  return {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY || 'AIzaSyB4qKsRk_raCHs32OioeH7LX4pQHsF-U8I',
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || 'vanguard1-b653d.firebaseapp.com',
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || 'vanguard1-b653d',
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || 'vanguard1-b653d.firebasestorage.app',
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '438614523977',
    appId: import.meta.env.VITE_FIREBASE_APP_ID || '1:438614523977:web:ee220d9f4466297d0e7f98',
  };
}

export function saveFirebaseConfig(config: FirebaseCustomConfig): void {
  localStorage.setItem('vanguard_firebase_config', JSON.stringify(config));
  resetFirebaseApp();
}

export function clearFirebaseConfig(): void {
  localStorage.removeItem('vanguard_firebase_config');
  resetFirebaseApp();
}

function resetFirebaseApp(): void {
  db = null;
  const apps = getApps();
  apps.forEach((app) => {
    try {
      deleteApp(app);
    } catch (e) {
      // ignore
    }
  });
}

// Check if basic Firebase settings are defined
export function isFirebaseConfigured(): boolean {
  const config = getFirebaseConfig();
  return !!(config.apiKey && config.projectId);
}

// Lazy initialization of Firebase
let db: any = null;

function getFirestoreInstance() {
  const config = getFirebaseConfig();
  if (!config.apiKey || !config.projectId) {
    return null;
  }
  
  try {
    if (!db) {
      const apps = getApps();
      let app;
      if (apps.length === 0) {
        app = initializeApp(config);
      } else {
        app = apps[0];
      }
      try {
        db = initializeFirestore(app, {
          experimentalAutoDetectLongPolling: true,
        });
      } catch (e) {
        db = getFirestore(app);
      }
    }
    return db;
  } catch (error: any) {
    console.warn('Falha ao inicializar o Firebase (modo offline ou erro de config):', error?.message || error);
    return null;
  }
}

const DOCUMENT_ID = 'vanguard_global_state';

let pushDebounceTimer: any = null;

function withTimeout<T>(promise: Promise<T>, ms: number = 5000, fallbackValue: T): Promise<T> {
  return new Promise((resolve) => {
    let completed = false;
    const timer = setTimeout(() => {
      if (!completed) {
        completed = true;
        console.warn(`Operação do Firebase excedeu o tempo limite de ${ms}ms.`);
        resolve(fallbackValue);
      }
    }, ms);

    promise
      .then((res) => {
        if (!completed) {
          completed = true;
          clearTimeout(timer);
          resolve(res);
        }
      })
      .catch((err) => {
        if (!completed) {
          completed = true;
          clearTimeout(timer);
          console.warn('Erro na operação do Firebase:', err);
          resolve(fallbackValue);
        }
      });
  });
}

/**
 * Pushes local state to Firebase Firestore immediately without debounce.
 */
export async function pushStateToFirebaseImmediate(state: DatabaseState): Promise<boolean> {
  const firestore = getFirestoreInstance();
  if (!firestore) return false;

  const runPush = async (): Promise<boolean> => {
    try {
      const docRef = doc(firestore, 'app_state', DOCUMENT_ID);
      // Sanitize state to avoid undefined or circular references
      const stateToSave = JSON.parse(JSON.stringify(state));
      
      await setDoc(docRef, {
        ...stateToSave,
        updatedAt: new Date().toISOString(),
      });
      console.log('Base de dados sincronizada com sucesso no Firebase Firestore!');
      return true;
    } catch (error: any) {
      console.warn('Aviso: Não foi possível enviar estado para o Firebase (operando em modo offline local):', error?.message || error);
      return false;
    }
  };

  return withTimeout(runPush(), 5000, false);
}

/**
 * Pushes the local state to Firebase Firestore with debounce (400ms).
 */
export function pushStateToFirebase(state: DatabaseState): Promise<boolean> {
  if (pushDebounceTimer) {
    clearTimeout(pushDebounceTimer);
  }

  return new Promise((resolve) => {
    pushDebounceTimer = setTimeout(async () => {
      const res = await pushStateToFirebaseImmediate(state);
      resolve(res);
    }, 400);
  });
}

/**
 * Pulls the latest state from Firebase Firestore.
 */
export async function pullStateFromFirebase(): Promise<DatabaseState | null> {
  const firestore = getFirestoreInstance();
  if (!firestore) return null;

  const runPull = async (): Promise<DatabaseState | null> => {
    try {
      const docRef = doc(firestore, 'app_state', DOCUMENT_ID);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        const data = docSnap.data();
        const { updatedAt, ...dbState } = data;
        return dbState as DatabaseState;
      }
      return null;
    } catch (error: any) {
      console.warn('Aviso: Não foi possível obter documento do Firebase (operando em modo offline local):', error?.message || error);
      return null;
    }
  };

  return withTimeout(runPull(), 5000, null);
}

/**
 * Subscribes to real-time changes from Firebase Firestore.
 */
export function subscribeToFirebaseState(
  onStateUpdate: (state: DatabaseState) => void,
  onError?: (err: any) => void
): (() => void) | null {
  const firestore = getFirestoreInstance();
  if (!firestore) return null;

  try {
    const docRef = doc(firestore, 'app_state', DOCUMENT_ID);
    const unsubscribe = onSnapshot(docRef, (docSnap) => {
      // Ignore local pending writes to avoid feedback loops
      if (docSnap.metadata && docSnap.metadata.hasPendingWrites) {
        return;
      }

      if (docSnap.exists()) {
        const data = docSnap.data();
        const { updatedAt, ...dbState } = data;
        onStateUpdate(dbState as DatabaseState);
      }
    }, (error) => {
      console.warn('Erro na sincronização em tempo real do Firebase:', error);
      if (onError) onError(error);
    });

    return unsubscribe;
  } catch (error) {
    console.warn('Falha ao registrar ouvinte em tempo real:', error);
    return null;
  }
}

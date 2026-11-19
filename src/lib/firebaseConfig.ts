export interface FirebaseConfig {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket: string;
  messagingSenderId: string;
  appId: string;
}

// Default configuration provided for paddle-kyu
const DEFAULT_FIREBASE_CONFIG: FirebaseConfig = {
  apiKey: "AIzaSyBGCMgVDHPB82dyLB9yUbkxOf9f610HbUY",
  authDomain: "paddle-kyu.firebaseapp.com",
  projectId: "paddle-kyu",
  storageBucket: "paddle-kyu.firebasestorage.app",
  messagingSenderId: "490695426743",
  appId: "1:490695426743:web:d8c7bfd0f24549914b0332"
};

export const getStoredFirebaseConfig = (): FirebaseConfig | null => {
  try {
    const custom = localStorage.getItem('paddle_firebase_config');
    if (custom) {
      if (custom === 'mock') {
        return null;
      }
      const parsed = JSON.parse(custom);
      if (parsed.apiKey && parsed.projectId) {
        return parsed;
      }
    }
  } catch (e) {
    console.error('Failed to parse stored Firebase config', e);
  }

  // Check env vars
  const envKey = import.meta.env.VITE_FIREBASE_API_KEY;
  const envProject = import.meta.env.VITE_FIREBASE_PROJECT_ID;

  if (envKey && envProject && !envKey.includes('your-api-key')) {
    return {
      apiKey: envKey,
      authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || `${envProject}.firebaseapp.com`,
      projectId: envProject,
      storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || `${envProject}.firebasestorage.app`,
      messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '',
      appId: import.meta.env.VITE_FIREBASE_APP_ID || '',
    };
  }

  // Fallback to active project configuration
  return DEFAULT_FIREBASE_CONFIG;
};

export const saveFirebaseConfig = (config: FirebaseConfig | null) => {
  if (config) {
    localStorage.setItem('paddle_firebase_config', JSON.stringify(config));
  } else {
    localStorage.setItem('paddle_firebase_config', 'mock');
  }
};

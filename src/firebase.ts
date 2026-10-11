import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';

const app = initializeApp(firebaseConfig);
const dbId = (firebaseConfig as any).firestoreDatabaseId || 'ai-studio-48e0ba5b-2520-4716-b2fe-10af217c3181';
export const db = getFirestore(app, dbId);
export const auth = getAuth(app);

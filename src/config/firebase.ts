import AsyncStorage from "@react-native-async-storage/async-storage";
import { getApp, getApps, initializeApp } from "firebase/app";
import * as FirebaseAuth from "firebase/auth";
import { browserLocalPersistence, initializeAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getFunctions } from "firebase/functions";
import { Platform } from "react-native";
// Configuração pública do mesmo aplicativo Firebase do projeto original.
const app = getApps().length ? getApp() : initializeApp({
  apiKey: "AIzaSyBAMfd4iS6Ip2P9ePNk57DOgnCyGIMd_0U",
  authDomain: "agendafamiliarkotlin.firebaseapp.com",
  projectId: "agendafamiliarkotlin",
  storageBucket: "agendafamiliarkotlin.firebasestorage.app",
  messagingSenderId: "1038445694694",
  appId: "1:1038445694694:web:e7f47a89ac4742d84e3527",
});
const nativeAuth = FirebaseAuth as typeof FirebaseAuth & {
  getReactNativePersistence: (
    storage: typeof AsyncStorage,
  ) => import("firebase/auth").Persistence;
};
// initializeAuth só pode rodar uma vez por app; no Fast Refresh reutiliza a instância existente.
function createAuth() {
  try {
    return Platform.OS === "web"
      ? initializeAuth(app, { persistence: browserLocalPersistence })
      : initializeAuth(app, {
          persistence: nativeAuth.getReactNativePersistence(AsyncStorage),
        });
  } catch {
    return FirebaseAuth.getAuth(app);
  }
}
export const auth = createAuth();
export const db = getFirestore(app);
export const functions = getFunctions(app, "us-central1");

import { initializeApp } from "firebase/app";
import {
  initializeAuth,
  browserLocalPersistence,
} from "firebase/auth";
import * as FirebaseAuth from "firebase/auth";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";
import { getFirestore } from "firebase/firestore";
import { getFunctions } from "firebase/functions";
// Configuração pública do mesmo aplicativo Firebase do projeto original.
const app = initializeApp({
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
export const auth =
  Platform.OS === "web"
    ? initializeAuth(app, { persistence: browserLocalPersistence })
    : initializeAuth(app, {
        persistence: nativeAuth.getReactNativePersistence(AsyncStorage),
      });
export const db = getFirestore(app);
export const functions = getFunctions(app, "us-central1");

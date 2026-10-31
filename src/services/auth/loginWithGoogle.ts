import { GoogleAuthProvider, signInWithCredential, signInWithPopup } from "firebase/auth";
import { Platform } from "react-native";
import { auth } from "../../config/firebase";
// Client OAuth "web" do projeto Firebase (google-services.json, client_type 3).
const webClientId = "1038445694694-urk08bl8efnnue8ujj75ofn0tfedbu8u.apps.googleusercontent.com";
type GoogleModule = typeof import("@react-native-google-signin/google-signin");
// O módulo nativo não existe no Expo Go: carrega só quando usado.
function nativeGoogle(): GoogleModule | null {
  try {
    return require("@react-native-google-signin/google-signin") as GoogleModule;
  } catch {
    return null;
  }
}
export async function loginWithGoogle() {
  if (Platform.OS === "web") {
    await signInWithPopup(auth, new GoogleAuthProvider());
    return;
  }
  const google = nativeGoogle();
  if (!google)
    throw new Error("O login com Google funciona no app instalado (APK), não no Expo Go.");
  const { GoogleSignin, isSuccessResponse } = google;
  GoogleSignin.configure({ webClientId });
  await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
  const response = await GoogleSignin.signIn();
  if (!isSuccessResponse(response)) return; // cancelado pelo usuário
  const idToken = response.data.idToken;
  if (!idToken) throw new Error("O Google não devolveu a identificação. Tente novamente.");
  await signInWithCredential(auth, GoogleAuthProvider.credential(idToken));
}
/** Esquece a conta Google escolhida, para a próxima entrada poder trocar de conta. */
export async function forgetGoogleAccount() {
  if (Platform.OS === "web") return;
  await nativeGoogle()?.GoogleSignin.signOut().catch(() => {});
}

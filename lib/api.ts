import { auth } from "@/lib/firebase";
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  updateProfile,
} from "firebase/auth";

// ── Helpers de cookie ─────────────────────────────────────────
function setTokenCookie(token: string) {
  const expires = new Date();
  expires.setSeconds(expires.getSeconds() + 60); // 1 minuto
  document.cookie = `token=${token}; expires=${expires.toUTCString()}; path=/; SameSite=Strict${
    process.env.NODE_ENV === "production" ? "; Secure" : ""
  }`;
}

function removeTokenCookie() {
  document.cookie = "token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
}

// ── Login ─────────────────────────────────────────────────────
export async function loginUser(email: string, password: string) {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const token = await userCredential.user.getIdToken();

    setTokenCookie(token);

    return { success: true, data: { token, user: userCredential.user } };
  } catch (error: any) {
    const messages: Record<string, string> = {
      "auth/invalid-credential": "Correo o contraseña incorrectos.",
      "auth/too-many-requests":  "Demasiados intentos. Intenta más tarde.",
    };
    return { success: false, message: messages[error.code] ?? "Error al iniciar sesión." };
  }
}

// ── Registro ──────────────────────────────────────────────────
export async function registerUser(name: string, email: string, password: string) {
  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    await updateProfile(userCredential.user, { displayName: name });
    const token = await userCredential.user.getIdToken();

    setTokenCookie(token);

    return { success: true, data: { token, user: userCredential.user } };
  } catch (error: any) {
    const messages: Record<string, string> = {
      "auth/email-already-in-use": "Ya existe una cuenta con ese correo.",
      "auth/invalid-email":        "Correo electrónico inválido.",
      "auth/weak-password":        "La contraseña debe tener al menos 6 caracteres.",
    };
    return { success: false, message: messages[error.code] ?? "Error al crear la cuenta." };
  }
}

// ── Logout ────────────────────────────────────────────────────
export async function logoutUser() {
  await signOut(auth);
  removeTokenCookie();
  return { success: true };
}

// ── Renovar token ─────────────────────────────────────────────
export async function refreshToken() {
  const user = auth.currentUser;
  if (!user) return;
  const token = await user.getIdToken(true);
  setTokenCookie(token);
}
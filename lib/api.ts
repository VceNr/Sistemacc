import { db } from "@/lib/firebase";
import {
  getAuth,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
} from "firebase/auth";
import {
  collection,
  query,
  where,
  getDocs,
  setDoc,
  doc,
  serverTimestamp,
} from "firebase/firestore";

const auth = getAuth();

// ── Helpers de cookie ─────────────────────────────────────────
function setCookie(name: string, value: string, seconds: number) {
  const expires = new Date();
  expires.setSeconds(expires.getSeconds() + seconds);
  document.cookie = `${name}=${value}; expires=${expires.toUTCString()}; path=/; SameSite=Strict${
    process.env.NODE_ENV === "production" ? "; Secure" : ""
  }`;
}

function removeCookie(name: string) {
  document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
}

// ── Login ─────────────────────────────────────────────────────
export async function loginUser(email: string, password: string) {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

    // Buscar usuario en Firestore por UID
    const q = query(collection(db, "users"), where("uid", "==", user.uid));
    const snapshot = await getDocs(q);

    if (snapshot.empty) {
      return { success: false, message: "Usuario no encontrado en la base de datos." };
    }

    const userData = snapshot.docs[0].data();

    if (userData.estado !== "activo") {
      return { success: false, message: "Esta cuenta está inactiva." };
    }

    // Guardar token y rol en cookies
    setCookie("token", user.uid,       3600);
    setCookie("rol",   userData.cargo, 3600);

    // Redirigir según cargo
    let redirectRoute = "/dashboard";
    if (userData.cargo === "admin")    redirectRoute = "/panel-admin";
    if (userData.cargo === "analista") redirectRoute = "/panel-admin";

    return {
      success: true,
      redirectUrl: redirectRoute,
      data: {
        uid:    userData.uid,
        correo: userData.correo,
        nombre: userData.nombre,
        cargo:  userData.cargo,
        estado: userData.estado,
      },
    };
  } catch (error: any) {
    console.error("Error en login:", error);
    if (
      error.code === "auth/invalid-credential" ||
      error.code === "auth/wrong-password"
    ) {
      return { success: false, message: "Correo o contraseña incorrectos." };
    }
    return { success: false, message: "Error al iniciar sesión." };
  }
}

// ── Registro ──────────────────────────────────────────────────
export async function registerUser(
  nombre: string,
  correo: string,
  password: string,
  cargo: string = "analista"
) {
  try {
    const userCredential = await createUserWithEmailAndPassword(auth, correo, password);
    const user = userCredential.user;

    const newUserRef = doc(collection(db, "users"));
    await setDoc(newUserRef, {
      uid:       user.uid,
      nombre,
      correo,
      cargo,
      estado:    "activo",
      createdAt: serverTimestamp(),
    });

    setCookie("token", user.uid, 3600);
    setCookie("rol",   cargo,    3600);

    return { success: true, data: { uid: user.uid, correo, nombre, cargo } };
  } catch (error: any) {
    console.error("Error en registro:", error);
    if (error.code === "auth/email-already-in-use") {
      return { success: false, message: "Ya existe una cuenta con ese correo." };
    }
    return { success: false, message: "Error al crear la cuenta." };
  }
}

// ── Logout ────────────────────────────────────────────────────
export async function logoutUser() {
  try {
    await signOut(auth);
    removeCookie("token");
    removeCookie("rol");
    return { success: true };
  } catch (error) {
    console.error("Error al cerrar sesión:", error);
    return { success: false, message: "Error al cerrar sesión." };
  }
}
import { db } from "@/lib/firebase";
import { 
  getAuth, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut 
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

// Inicializamos Auth
const auth = getAuth();

// ── Helpers de cookie ─────────────────────────────────────────
// Nota: Firebase gestiona su propia sesión automáticamente en el cliente, 
// pero mantenemos tus cookies si las usas para validaciones en el servidor (Next.js middleware).
function setTokenCookie(value: string) {
  const expires = new Date();
  expires.setSeconds(expires.getSeconds() + 3600); // Subido a 1 hora para mayor utilidad
  document.cookie = `token=${value}; expires=${expires.toUTCString()}; path=/; SameSite=Strict${
    process.env.NODE_ENV === "production" ? "; Secure" : ""
  }`;
}

function removeTokenCookie() {
  document.cookie = "token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
}

// ── Login ─────────────────────────────────────────────────────
export async function loginUser(email: string, password: string) {
  try {
    // 1. Autenticar con Firebase Auth (Reemplaza a bcrypt)
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

    // 2. Buscar al usuario en Firestore usando el UID de Authentication
    const q = query(collection(db, "users"), where("uid", "==", user.uid));
    const snapshot = await getDocs(q);

    if (snapshot.empty) {
      // Por si el usuario está en Auth pero no en la base de datos
      return { success: false, message: "Usuario no encontrado en la base de datos." };
    }

    const userDoc = snapshot.docs[0];
    const userData = userDoc.data();

    // 3. Verificar estado (opcional, pero vi que tienes un campo "estado: activo")
    if (userData.estado !== "activo") {
      return { success: false, message: "Esta cuenta está inactiva." };
    }

    // Guardar sesión en cookie
    setTokenCookie(user.uid);

// 4. Definir a qué página redirigir según el cargo
    let redirectRoute = "/dashboard"; // ruta por defecto
    if (userData.cargo === "admin") {
      redirectRoute = "/panel-admin"; // <-- CAMBIADO para coincidir con tu carpeta
    } else if (userData.cargo === "analista") {
      redirectRoute = "/panel-analista"; // <-- CAMBIADO para coincidir con tu carpeta
    }

    return {
      success: true,
      redirectUrl: redirectRoute, // Devolvemos la ruta al frontend
      data: {
        uid: userData.uid,
        correo: userData.correo,
        nombre: userData.nombre,
        cargo: userData.cargo,
        estado: userData.estado,
      },
    };
  } catch (error: any) {
    console.error("Error en login:", error);
    // Personalizar mensajes de error de Firebase Auth
    if (error.code === 'auth/invalid-credential' || error.code === 'auth/wrong-password') {
      return { success: false, message: "Correo o contraseña incorrectos." };
    }
    return { success: false, message: "Error al iniciar sesión." };
  }
}

// ── Registro ──────────────────────────────────────────────────
export async function registerUser(nombre: string, correo: string, password: string, cargo: string = "analista") {
  try {
    // 1. Crear el usuario en Firebase Authentication (ya valida si el correo existe)
    const userCredential = await createUserWithEmailAndPassword(auth, correo, password);
    const user = userCredential.user;

    // 2. Guardar en Firestore
    // En lugar de addDoc, usamos setDoc para que el ID del documento pueda ser el mismo UID de Auth
    // o simplemente creamos un documento nuevo. Para seguir la estructura de tu imagen:
    const newUserRef = doc(collection(db, "users")); // Genera un ID aleatorio como en tu imagen
    
    await setDoc(newUserRef, {
      uid: user.uid,        // Relación directa con Firebase Auth
      nombre: nombre,
      correo: correo,
      cargo: cargo,         // "admin" | "analista"
      estado: "activo",     // Añadido según tu imagen
      createdAt: serverTimestamp(),
    });

    setTokenCookie(user.uid);

    return { success: true, data: { uid: user.uid, correo, nombre, cargo } };
  } catch (error: any) {
    console.error("Error en registro:", error);
    if (error.code === 'auth/email-already-in-use') {
      return { success: false, message: "Ya existe una cuenta con ese correo." };
    }
    return { success: false, message: "Error al crear la cuenta." };
  }
}

// ── Logout ────────────────────────────────────────────────────
export async function logoutUser() {
  try {
    await signOut(auth); // Cerrar sesión en Firebase Auth
    removeTokenCookie(); // Limpiar cookie local
    return { success: true };
  } catch (error) {
    console.error("Error al cerrar sesión:", error);
    return { success: false, message: "Error al cerrar sesión." };
  }
}
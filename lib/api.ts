import { auth, db, storage } from "@/lib/firebase";
import { logger } from "@/lib/logger";
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  getAuth,
} from "firebase/auth";
import { initializeApp, deleteApp } from "firebase/app";
import {
  collection, query, where, getDocs, setDoc, doc,
  addDoc, serverTimestamp, getDoc, updateDoc, deleteDoc, orderBy,
} from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import type {
  Severidad, Estado, Hallazgo, HistorialItem, LogAuditoria, CreateHallazgoData,
} from "@/lib/types";

export type { Severidad, Estado, Hallazgo, HistorialItem, LogAuditoria, CreateHallazgoData };

// ── Helpers de sesión (HttpOnly via API route) ─────────────────
async function setSession(uid: string, rol: string) {
  await fetch("/api/auth/session", {
    method:  "POST",
    headers: { "Content-Type": "application/json" },
    body:    JSON.stringify({ uid, rol }),
  });
}

async function clearSession() {
  await fetch("/api/auth/session", { method: "DELETE" });
}

// ── Auditoría ──────────────────────────────────────────────────
export async function registrarAuditoria(
  usuario: string, accion: string, detalle: string
): Promise<void> {
  try {
    await addDoc(collection(db, "audit_logs"), {
      usuario, accion, detalle, timestamp: serverTimestamp(),
    });
  } catch (e) {
    // No bloquear la operación principal si falla la auditoría,
    // pero sí registrar el fallo para monitoreo del servidor
    logger.error("[Auditoría] Error al guardar log:", accion, e);
  }
}

export async function getAuditLogs(): Promise<LogAuditoria[]> {
  const q    = query(collection(db, "audit_logs"), orderBy("timestamp", "desc"));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() })) as LogAuditoria[];
}

// ── Hallazgos ──────────────────────────────────────────────────
export async function getHallazgos(): Promise<Hallazgo[]> {
  const q    = query(collection(db, "findings"), orderBy("creadoEn", "desc"));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() })) as Hallazgo[];
}

export async function getHallazgo(id: string): Promise<Hallazgo | null> {
  const snap = await getDoc(doc(db, "findings", id));
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() } as Hallazgo;
}

export async function createHallazgo(data: CreateHallazgoData): Promise<string> {
  const docRef = await addDoc(collection(db, "findings"), {
    ...data,
    estado:            "Nuevo" as Estado,
    imagenesEvidencia: [],
    creadoEn:          serverTimestamp(),
    actualizadoEn:     serverTimestamp(),
  });
  return docRef.id;
}

export async function updateHallazgo(
  id: string, data: Partial<Omit<Hallazgo, "id">>
): Promise<void> {
  await updateDoc(doc(db, "findings", id), {
    ...data,
    actualizadoEn: serverTimestamp(),
  });
}

export async function deleteHallazgo(id: string): Promise<void> {
  await deleteDoc(doc(db, "findings", id));
}

// ── Historial de cambios ───────────────────────────────────────
export async function registrarHistorial(
  findingId:     string,
  campo:         string,
  valorAnterior: string,
  valorNuevo:    string,
  modificadoPor: string,
): Promise<void> {
  try {
    await addDoc(collection(db, "finding_history"), {
      findingId, campo, valorAnterior, valorNuevo,
      modificadoPor, fecha: serverTimestamp(),
    });
  } catch (e) {
    logger.error("Error registrando historial:", e);
  }
}

export async function getHistorialHallazgo(findingId: string): Promise<HistorialItem[]> {
  const q    = query(
    collection(db, "finding_history"),
    where("findingId", "==", findingId),
    orderBy("fecha", "desc"),
  );
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() })) as HistorialItem[];
}

// ── Firebase Storage ───────────────────────────────────────────
const MIME_PERMITIDOS = ["image/jpeg", "image/png", "image/webp", "image/gif"];
const MAX_SIZE_BYTES  = 5 * 1024 * 1024; // 5 MB

async function validarMime(file: File): Promise<boolean> {
  // Verificar el tipo MIME declarado
  if (!MIME_PERMITIDOS.includes(file.type)) return false;
  // Verificar los magic bytes reales (primeros 4 bytes del binario)
  const buffer = await file.slice(0, 4).arrayBuffer();
  const bytes  = new Uint8Array(buffer);
  const jpeg = bytes[0] === 0xFF && bytes[1] === 0xD8;
  const png  = bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4E && bytes[3] === 0x47;
  const gif  = bytes[0] === 0x47 && bytes[1] === 0x49 && bytes[2] === 0x46;
  const webp = bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46;
  return jpeg || png || gif || webp;
}

export async function subirImagenesEvidencia(
  findingId: string, files: File[]
): Promise<string[]> {
  if (files.length === 0) return [];

  for (const file of files) {
    if (file.size > MAX_SIZE_BYTES) {
      throw new Error(`El archivo "${file.name}" supera el límite de 5 MB.`);
    }
    const valido = await validarMime(file);
    if (!valido) {
      throw new Error(`El archivo "${file.name}" no es una imagen válida (JPEG, PNG, WebP o GIF).`);
    }
  }

  return Promise.all(
    files.map(async (file, i) => {
      // Usar extensión del MIME real, nunca del nombre del archivo
      const ext        = file.type.split("/")[1].replace("jpeg", "jpg");
      const path       = `findings/${findingId}/evidencia_${i + 1}_${Date.now()}.${ext}`;
      const storageRef = ref(storage, path);
      await uploadBytes(storageRef, file);
      return getDownloadURL(storageRef);
    }),
  );
}

// ── Migración one-time: docId aleatorio → UID ─────────────────
// Requiere reglas de Firestore permisivas temporalmente.
// Solo llamar una vez; después desplegar las reglas estrictas.
export async function migrarUsersDocId(): Promise<{ migrados: number; omitidos: number }> {
  const snap = await getDocs(collection(db, "users"));
  let migrados = 0;
  let omitidos = 0;

  for (const d of snap.docs) {
    const data = d.data();
    const uid  = data.uid as string | undefined;

    if (!uid || d.id === uid) { omitidos++; continue; }

    // Crear doc con UID como ID
    await setDoc(doc(db, "users", uid), data);
    // Eliminar doc con ID aleatorio
    await deleteDoc(doc(db, "users", d.id));
    migrados++;
  }

  return { migrados, omitidos };
}

// ── Usuarios ───────────────────────────────────────────────────
export async function getUserByUid(
  uid: string
): Promise<{ cargo: string; nombre: string } | null> {
  const q    = query(collection(db, "users"), where("uid", "==", uid));
  const snap = await getDocs(q);
  if (snap.empty) return null;
  const data = snap.docs[0].data();
  return { cargo: data.cargo ?? null, nombre: data.nombre ?? null };
}

export interface UserRecord {
  docId:   string;
  uid:     string;
  nombre:  string;
  correo:  string;
  cargo:   string;
  estado:  string;
}

export async function getAllUsers(): Promise<UserRecord[]> {
  const snap = await getDocs(collection(db, "users"));
  return snap.docs.map(d => ({
    docId:  d.id,
    uid:    d.data().uid    ?? "",
    nombre: d.data().nombre ?? "",
    correo: d.data().correo ?? "",
    cargo:  d.data().cargo  ?? "",
    estado: d.data().estado ?? "activo",
  }));
}

export async function toggleUserEstado(docId: string, nuevoEstado: "activo" | "inactivo") {
  await updateDoc(doc(db, "users", docId), { estado: nuevoEstado });
}

// ── Login ──────────────────────────────────────────────────────
export async function loginUser(email: string, password: string) {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const user           = userCredential.user;

    const userData = await getUserByUid(user.uid);

    if (!userData) {
      return { success: false, message: "Usuario no encontrado en la base de datos." };
    }

    if ((userData as any).estado !== undefined && (userData as any).estado !== "activo") {
      return { success: false, message: "Esta cuenta está inactiva." };
    }

    // Necesitamos el estado completo — re-query para obtenerlo
    const q    = query(collection(db, "users"), where("uid", "==", user.uid));
    const snap = await getDocs(q);
    const full = snap.docs[0].data();

    if (full.estado !== "activo") {
      return { success: false, message: "Esta cuenta está inactiva." };
    }

    await setSession(user.uid, full.cargo);

    await registrarAuditoria(
      full.nombre ?? email, "LOGIN", `Inicio de sesión — cargo: ${full.cargo}`
    );

    return {
      success:     true,
      redirectUrl: "/panel-admin",
      data: {
        uid:    full.uid,
        correo: full.correo,
        nombre: full.nombre,
        cargo:  full.cargo,
        estado: full.estado,
      },
    };
  } catch (error: any) {
    logger.error("Error en login:", error);
    if (
      error.code === "auth/invalid-credential" ||
      error.code === "auth/wrong-password"
    ) {
      return { success: false, message: "Correo o contraseña incorrectos." };
    }
    return { success: false, message: "Error al iniciar sesión." };
  }
}

// ── Registro ───────────────────────────────────────────────────
export async function registerUser(
  nombre:   string,
  correo:   string,
  password: string,
  cargo:    string = "analista",
) {
  // Usamos una app secundaria para no reemplazar la sesión del admin
  const secondaryAppName = `register-${Date.now()}`;
  const firebaseConfig = {
    apiKey:            process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain:        process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId:         process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket:     process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId:             process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  };

  const secondaryApp = initializeApp(firebaseConfig, secondaryAppName);
  const secondaryAuth = getAuth(secondaryApp);

  try {
    const userCredential = await createUserWithEmailAndPassword(secondaryAuth, correo, password);
    const user           = userCredential.user;

    // Cerrar sesión de la app secundaria y eliminarla
    await signOut(secondaryAuth);
    await deleteApp(secondaryApp);

    // Usar el UID como ID del documento — requerido por las Firestore Security Rules
    const newUserRef = doc(db, "users", user.uid);
    await setDoc(newUserRef, {
      uid:       user.uid,
      nombre,
      correo,
      cargo,
      estado:    "activo",
      createdAt: serverTimestamp(),
    });

    return { success: true, data: { uid: user.uid, correo, nombre, cargo } };
  } catch (error: any) {
    await signOut(secondaryAuth).catch(() => {});
    await deleteApp(secondaryApp).catch(() => {});
    logger.error("Error en registro:", error);
    if (error.code === "auth/email-already-in-use") {
      return { success: false, message: "Ya existe una cuenta con ese correo." };
    }
    return { success: false, message: "Error al crear la cuenta." };
  }
}

// ── Logout ─────────────────────────────────────────────────────
export async function logoutUser(nombre?: string) {
  try {
    if (nombre) {
      await registrarAuditoria(nombre, "LOGOUT", "Cierre de sesión");
    }
    await signOut(auth);
    await clearSession();
    return { success: true };
  } catch (error) {
    logger.error("Error al cerrar sesión:", error);
    return { success: false, message: "Error al cerrar sesión." };
  }
}

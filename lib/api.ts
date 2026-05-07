import { auth, db, storage } from "@/lib/firebase";
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
} from "firebase/auth";
import {
  collection, query, where, getDocs, setDoc, doc,
  addDoc, serverTimestamp, getDoc, updateDoc, deleteDoc, orderBy,
} from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import type {
  Severidad, Estado, Hallazgo, HistorialItem, LogAuditoria, CreateHallazgoData,
} from "@/lib/types";

export type { Severidad, Estado, Hallazgo, HistorialItem, LogAuditoria, CreateHallazgoData };

// ── Helpers de cookie ──────────────────────────────────────────
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

// ── Auditoría ──────────────────────────────────────────────────
export async function registrarAuditoria(
  usuario: string, accion: string, detalle: string
): Promise<void> {
  try {
    await addDoc(collection(db, "audit_logs"), {
      usuario, accion, detalle, timestamp: serverTimestamp(),
    });
  } catch (e) {
    console.error("Error registrando auditoría:", e);
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
    console.error("Error registrando historial:", e);
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
export async function subirImagenesEvidencia(
  findingId: string, files: File[]
): Promise<string[]> {
  if (files.length === 0) return [];
  return Promise.all(
    files.map(async (file, i) => {
      const ext        = file.name.split(".").pop();
      const path       = `findings/${findingId}/evidencia_${i + 1}_${Date.now()}.${ext}`;
      const storageRef = ref(storage, path);
      await uploadBytes(storageRef, file);
      return getDownloadURL(storageRef);
    }),
  );
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

    setCookie("token", user.uid,    3600);
    setCookie("rol",   full.cargo,  3600);

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

// ── Registro ───────────────────────────────────────────────────
export async function registerUser(
  nombre:   string,
  correo:   string,
  password: string,
  cargo:    string = "analista",
) {
  try {
    const userCredential = await createUserWithEmailAndPassword(auth, correo, password);
    const user           = userCredential.user;

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

// ── Logout ─────────────────────────────────────────────────────
export async function logoutUser(nombre?: string) {
  try {
    if (nombre) {
      await registrarAuditoria(nombre, "LOGOUT", "Cierre de sesión");
    }
    await signOut(auth);
    removeCookie("token");
    removeCookie("rol");
    return { success: true };
  } catch (error) {
    console.error("Error al cerrar sesión:", error);
    return { success: false, message: "Error al cerrar sesión." };
  }
}

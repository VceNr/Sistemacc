"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { onAuthStateChanged, User } from "firebase/auth";
import { collection, query, where, getDocs } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";

interface AuthContextType {
  user: User | null;
  loading: boolean;
  rol: "admin" | "analista" | null;
  nombre: string | null;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  rol: null,
  nombre: null,
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user,    setUser]    = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [rol,     setRol]     = useState<"admin" | "analista" | null>(null);
  const [nombre,  setNombre]  = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        // Busca por campo uid en vez de por ID del documento
        const q = query(collection(db, "users"), where("uid", "==", firebaseUser.uid));
        const snap = await getDocs(q);
        if (!snap.empty) {
          const data = snap.docs[0].data();
          setRol(data.cargo ?? null);
          setNombre(data.nombre ?? null);
        }
        setUser(firebaseUser);
      } else {
        setUser(null);
        setRol(null);
        setNombre(null);
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, rol, nombre }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
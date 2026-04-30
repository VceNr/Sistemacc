"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import { collection, query, where, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase"; // Ajusta esta ruta según tu proyecto
import { Button } from "@/components/ui/button";
import { logoutUser } from "@/lib/api";

export default function PanelAnalista() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [userData, setUserData] = useState<any>(null);

  useEffect(() => {
    const auth = getAuth();
    
    // Escuchar el estado de autenticación
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        // No hay usuario logueado -> pa' fuera
        router.push("/");
        return;
      }

      try {
        // Buscar el usuario en Firestore
        const q = query(collection(db, "users"), where("uid", "==", user.uid));
        const snapshot = await getDocs(q);

        if (snapshot.empty) {
          router.push("/");
          return;
        }

        const data = snapshot.docs[0].data();

        // VALIDACIÓN DE CARGO
// VALIDACIÓN DE CARGO
        if (data.cargo !== "analista") {
          // Si es un admin intentando entrar al panel de analista, lo regresamos a su panel
          router.push("/panel-admin"); // <-- CAMBIADO
          return;
        }

        // Usuario autorizado
        setUserData(data);
        setLoading(false);

      } catch (error) {
        console.error("Error verificando rol:", error);
        router.push("/");
      }
    });

    return () => unsubscribe();
  }, [router]);

  const handleLogout = async () => {
    await logoutUser();
    router.push("/");
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0a0a0f] text-white">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white p-8 font-sans">
      <header className="flex justify-between items-center mb-10 border-b border-white/10 pb-4">
        <div>
          <h1 className="text-3xl font-light">Panel <span className="font-semibold text-purple-400">Analítico</span></h1>
          <p className="text-sm text-gray-400 mt-1">Sesión iniciada como: {userData?.correo}</p>
        </div>
        <Button onClick={handleLogout} variant="outline" className="text-white border-white/20 hover:bg-white/10">
          Cerrar sesión
        </Button>
      </header>

      <main className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Aquí va el contenido exclusivo de los analistas */}
        <div className="bg-white/5 border border-white/10 p-6 rounded-xl backdrop-blur-md">
          <h2 className="text-xl font-medium mb-2 text-purple-300">Reportes de hoy</h2>
          <p className="text-gray-400 text-sm">Sube y revisa los datos analíticos de la jornada.</p>
        </div>
      </main>
    </div>
  );
}
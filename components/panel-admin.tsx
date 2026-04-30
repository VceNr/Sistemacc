"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import { collection, query, where, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase"; // Ajusta esta ruta según tu proyecto
import { Button } from "@/components/ui/button";
import { logoutUser } from "@/lib/api";

export default function PanelAdmin() {
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
        // Buscar el usuario en Firestore por su uid
        const q = query(collection(db, "users"), where("uid", "==", user.uid));
        const snapshot = await getDocs(q);

        if (snapshot.empty) {
          router.push("/");
          return;
        }

        const data = snapshot.docs[0].data();

        // VALIDACIÓN DE CARGO
// VALIDACIÓN DE CARGO
        if (data.cargo !== "admin") {
          // Si es un analista intentando entrar al panel de admin, lo regresamos a su lugar
          router.push("/panel-analista"); // <-- CAMBIADO
          return;
        }
        // Si pasa todas las validaciones, guardamos los datos y quitamos el loading
        setUserData(data);
        setLoading(false);

      } catch (error) {
        console.error("Error verificando rol:", error);
        router.push("/");
      }
    });

    // Limpiar el listener cuando el componente se desmonte
    return () => unsubscribe();
  }, [router]);

  const handleLogout = async () => {
    await logoutUser();
    router.push("/");
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0a0a0f] text-white">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white p-8 font-sans">
      <header className="flex justify-between items-center mb-10 border-b border-white/10 pb-4">
        <div>
          <h1 className="text-3xl font-light">Panel de <span className="font-semibold text-indigo-400">Administrador</span></h1>
          <p className="text-sm text-gray-400 mt-1">Bienvenido, {userData?.nombre}</p>
        </div>
        <Button onClick={handleLogout} variant="destructive">
          Cerrar sesión
        </Button>
      </header>

      <main className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Aquí va el contenido exclusivo de los admins */}
        <div className="bg-white/5 border border-white/10 p-6 rounded-xl backdrop-blur-md">
          <h2 className="text-xl font-medium mb-2 text-indigo-300">Gestión de Usuarios</h2>
          <p className="text-gray-400 text-sm">Crear, editar o eliminar cuentas del sistema.</p>
        </div>
      </main>
    </div>
  );
}
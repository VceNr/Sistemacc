"use client";

import { useAuth } from "@/lib/auth-context";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { logoutUser } from "@/lib/api";

export default function PanelAdmin() {
  const { user, rol, nombre, loading } = useAuth();
  const router = useRouter();

  // Protección de ruta: si no es admin, fuera
useEffect(() => {
  if (loading) return;
  if (!user) {
    router.push("/login");
    return;
  }
  if (rol !== null && rol !== "admin") {
    router.push("/panel-analista");
  }
}, [user, rol, loading]);

  async function handleLogout() {
    await logoutUser();
    router.push("/login");
  }

  if (loading) return (
    <div style={{ 
      minHeight: "100vh", display: "flex", 
      alignItems: "center", justifyContent: "center",
      background: "#0a0a0f", color: "#818cf8" 
    }}>
      Cargando...
    </div>
  );

  return (
    <div style={{ minHeight: "100vh", background: "#0a0a0f", color: "#f0f0f5", fontFamily: "DM Sans, sans-serif" }}>
      
      {/* Navbar */}
      <nav style={{
        borderBottom: "1px solid rgba(255,255,255,0.07)",
        padding: "0 2rem",
        display: "flex", alignItems: "center", justifyContent: "space-between",
        height: "60px", background: "rgba(15,15,22,0.9)", backdropFilter: "blur(12px)",
        position: "sticky", top: 0, zIndex: 50
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <div style={{
            width: 32, height: 32, borderRadius: 8,
            background: "linear-gradient(135deg, #6366f1, #818cf8)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 14, fontWeight: 700
          }}>S</div>
          <span style={{ fontWeight: 600, fontSize: 15 }}>SistemaCC</span>
          <span style={{
            background: "rgba(99,102,241,0.15)", border: "1px solid rgba(99,102,241,0.3)",
            borderRadius: 100, padding: "2px 10px", fontSize: 11,
            color: "#a5b4fc", letterSpacing: "0.06em"
          }}>ADMIN</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
          <span style={{ fontSize: 13, color: "#64648a" }}>Hola, <strong style={{ color: "#e8e8f0" }}>{nombre}</strong></span>
          <button onClick={handleLogout} style={{
            background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)",
            borderRadius: 8, padding: "6px 14px", color: "#f87171",
            fontSize: 13, cursor: "pointer", fontFamily: "inherit"
          }}>
            Cerrar sesión
          </button>
        </div>
      </nav>

      {/* Contenido principal */}
      <main style={{ padding: "2.5rem 2rem", maxWidth: 1200, margin: "0 auto" }}>
        
        {/* Título */}
        <div style={{ marginBottom: "2rem" }}>
          <h1 style={{ fontSize: 28, fontWeight: 700, marginBottom: 6 }}>Panel de Administración</h1>
          <p style={{ color: "#64648a", fontSize: 14 }}>Gestión de hallazgos de seguridad — Infopuntos</p>
        </div>

        {/* Cards de estadísticas — por ahora vacías, se llenan con datos reales */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "1rem", marginBottom: "2rem" }}>
          {[
            { label: "Total hallazgos",   valor: "0", color: "#6366f1" },
            { label: "Críticos",          valor: "0", color: "#ef4444" },
            { label: "En remediación",    valor: "0", color: "#f59e0b" },
            { label: "Cerrados",          valor: "0", color: "#10b981" },
          ].map((card) => (
            <div key={card.label} style={{
              background: "rgba(15,15,22,0.85)", border: "1px solid rgba(255,255,255,0.07)",
              borderRadius: 12, padding: "1.25rem 1.5rem"
            }}>
              <p style={{ fontSize: 12, color: "#64648a", marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.06em" }}>{card.label}</p>
              <p style={{ fontSize: 32, fontWeight: 700, color: card.color }}>{card.valor}</p>
            </div>
          ))}
        </div>

        {/* Acciones rápidas */}
        <div style={{ display: "flex", gap: "1rem", marginBottom: "2rem" }}>
          <button onClick={() => router.push("/panel-admin/hallazgos/nuevo")} style={{
            background: "linear-gradient(135deg, #6366f1, #818cf8)",
            border: "none", borderRadius: 10, padding: "10px 20px",
            color: "#fff", fontSize: 14, fontWeight: 500, cursor: "pointer",
            fontFamily: "inherit", boxShadow: "0 4px 20px rgba(99,102,241,0.3)"
          }}>
            + Nuevo hallazgo
          </button>
          <button onClick={() => router.push("/panel-admin/hallazgos")} style={{
            background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)",
            borderRadius: 10, padding: "10px 20px", color: "#e8e8f0",
            fontSize: 14, cursor: "pointer", fontFamily: "inherit"
          }}>
            Ver todos los hallazgos
          </button>
          <button onClick={() => router.push("/panel-admin/auditoria")} style={{
            background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)",
            borderRadius: 10, padding: "10px 20px", color: "#e8e8f0",
            fontSize: 14, cursor: "pointer", fontFamily: "inherit"
          }}>
            Ver auditoría
          </button>
        </div>

        {/* Tabla de hallazgos recientes — placeholder */}
        <div style={{
          background: "rgba(15,15,22,0.85)", border: "1px solid rgba(255,255,255,0.07)",
          borderRadius: 12, overflow: "hidden"
        }}>
          <div style={{ padding: "1.25rem 1.5rem", borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
            <h2 style={{ fontSize: 16, fontWeight: 600 }}>Hallazgos recientes</h2>
          </div>
          <div style={{ padding: "3rem", textAlign: "center", color: "#44445e" }}>
            <p style={{ fontSize: 14 }}>No hay hallazgos registrados aún.</p>
            <p style={{ fontSize: 12, marginTop: 6 }}>Crea el primero con el botón "Nuevo hallazgo"</p>
          </div>
        </div>

      </main>
    </div>
  );
}
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { collection, getDocs, query, orderBy, limit } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/lib/auth-context";
import { logoutUser } from "@/lib/api";

interface Hallazgo {
  id:        string;
  fecha:     string;
  activo:    string;
  tipo:      string;
  severidad: string;
  estado:    string;
  nombreCreador: string;
}

const colorSeveridad: Record<string, string> = {
  "Crítica": "#ef4444", "Alta": "#f97316",
  "Media":   "#eab308", "Baja": "#22c55e",
};

const colorEstado: Record<string, string> = {
  "Nuevo":          "#6366f1", "En análisis":    "#3b82f6",
  "En remediación": "#f59e0b", "Mitigado":       "#10b981",
  "Cerrado":        "#6b7280",
};

export default function PanelAdmin() {
  const { user, rol, nombre, loading: authLoading } = useAuth();
  const router = useRouter();

  const [hallazgos,  setHallazgos]  = useState<Hallazgo[]>([]);
  const [loading,    setLoading]    = useState(true);

  // Protección de ruta
  useEffect(() => {
    if (!authLoading) {
      if (!user) router.push("/login");
      if (rol !== null && rol !== "admin") router.push("/panel-analista");
    }
  }, [user, rol, authLoading]);

  // Cargar hallazgos
  useEffect(() => {
    async function cargar() {
      try {
        const q = query(collection(db, "findings"), orderBy("creadoEn", "desc"));
        const snap = await getDocs(q);
        setHallazgos(snap.docs.map(d => ({ id: d.id, ...d.data() })) as Hallazgo[]);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
    if (user) cargar();
  }, [user]);

  async function handleLogout() {
    await logoutUser();
    router.push("/login");
  }

  // Estadísticas calculadas
  const total        = hallazgos.length;
  const criticos     = hallazgos.filter(h => h.severidad === "Crítica").length;
  const enRemediacion = hallazgos.filter(h => h.estado === "En remediación").length;
  const cerrados     = hallazgos.filter(h => h.estado === "Cerrado").length;
  const recientes    = hallazgos.slice(0, 5); // últimos 5

  if (authLoading || loading) return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#0a0a0f", color: "#818cf8" }}>
      Cargando...
    </div>
  );

  return (
    <div style={{ minHeight: "100vh", background: "#0a0a0f", color: "#f0f0f5", fontFamily: "DM Sans, sans-serif" }}>

      {/* Navbar */}
      <nav style={{
        borderBottom: "1px solid rgba(255,255,255,0.07)", padding: "0 2rem",
        display: "flex", alignItems: "center", justifyContent: "space-between",
        height: "60px", background: "rgba(15,15,22,0.9)", backdropFilter: "blur(12px)",
        position: "sticky", top: 0, zIndex: 50,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <div style={{
            width: 32, height: 32, borderRadius: 8,
            background: "linear-gradient(135deg, #6366f1, #818cf8)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 14, fontWeight: 700,
          }}>S</div>
          <span style={{ fontWeight: 600, fontSize: 15 }}>SistemaCC</span>
          <span style={{
            background: "rgba(99,102,241,0.15)", border: "1px solid rgba(99,102,241,0.3)",
            borderRadius: 100, padding: "2px 10px", fontSize: 11, color: "#a5b4fc",
          }}>ADMIN</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
          <span style={{ fontSize: 13, color: "#64648a" }}>
            Hola, <strong style={{ color: "#e8e8f0" }}>{nombre}</strong>
          </span>
          <button onClick={handleLogout} style={{
            background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)",
            borderRadius: 8, padding: "6px 14px", color: "#f87171",
            fontSize: 13, cursor: "pointer", fontFamily: "inherit",
          }}>Cerrar sesión</button>
        </div>
      </nav>

      <main style={{ padding: "2.5rem 2rem", maxWidth: 1200, margin: "0 auto" }}>

        {/* Título */}
        <div style={{ marginBottom: "2rem" }}>
          <h1 style={{ fontSize: 28, fontWeight: 700, marginBottom: 6 }}>Panel de Administración</h1>
          <p style={{ color: "#64648a", fontSize: 14 }}>Gestión de hallazgos de seguridad — Infopuntos</p>
        </div>

        {/* Cards estadísticas con números reales */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "1rem", marginBottom: "2rem" }}>
          {[
            { label: "Total hallazgos",  valor: total,         color: "#6366f1" },
            { label: "Críticos",         valor: criticos,      color: "#ef4444" },
            { label: "En remediación",   valor: enRemediacion, color: "#f59e0b" },
            { label: "Cerrados",         valor: cerrados,      color: "#10b981" },
          ].map(card => (
            <div key={card.label} style={{
              background: "rgba(15,15,22,0.85)", border: "1px solid rgba(255,255,255,0.07)",
              borderRadius: 12, padding: "1.25rem 1.5rem",
            }}>
              <p style={{ fontSize: 12, color: "#64648a", marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.06em" }}>{card.label}</p>
              <p style={{ fontSize: 36, fontWeight: 700, color: card.color }}>{card.valor}</p>
            </div>
          ))}
        </div>

        {/* Acciones rápidas */}
        <div style={{ display: "flex", gap: "1rem", marginBottom: "2rem" }}>
          <button onClick={() => router.push("/panel-admin/hallazgos/nuevo")} style={{
            background: "linear-gradient(135deg, #6366f1, #818cf8)", border: "none",
            borderRadius: 10, padding: "10px 20px", color: "#fff",
            fontSize: 14, fontWeight: 500, cursor: "pointer", fontFamily: "inherit",
            boxShadow: "0 4px 20px rgba(99,102,241,0.3)",
          }}>+ Nuevo hallazgo</button>
          <button onClick={() => router.push("/panel-admin/hallazgos")} style={{
            background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)",
            borderRadius: 10, padding: "10px 20px", color: "#e8e8f0",
            fontSize: 14, cursor: "pointer", fontFamily: "inherit",
          }}>Ver todos los hallazgos</button>
          <button onClick={() => router.push("/panel-admin/auditoria")} style={{
            background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)",
            borderRadius: 10, padding: "10px 20px", color: "#e8e8f0",
            fontSize: 14, cursor: "pointer", fontFamily: "inherit",
          }}>Ver auditoría</button>
        </div>

        {/* Hallazgos recientes — últimos 5 */}
        <div style={{
          background: "rgba(15,15,22,0.85)", border: "1px solid rgba(255,255,255,0.07)",
          borderRadius: 12, overflow: "hidden",
        }}>
          <div style={{
            padding: "1.25rem 1.5rem", borderBottom: "1px solid rgba(255,255,255,0.07)",
            display: "flex", justifyContent: "space-between", alignItems: "center",
          }}>
            <h2 style={{ fontSize: 16, fontWeight: 600 }}>Hallazgos recientes</h2>
            <button onClick={() => router.push("/panel-admin/hallazgos")} style={{
              background: "none", border: "none", color: "#a5b4fc",
              fontSize: 13, cursor: "pointer", fontFamily: "inherit",
            }}>Ver todos →</button>
          </div>

          {recientes.length === 0 ? (
            <div style={{ padding: "3rem", textAlign: "center", color: "#44445e" }}>
              <p style={{ fontSize: 14 }}>No hay hallazgos registrados aún.</p>
              <p style={{ fontSize: 12, marginTop: 6 }}>Crea el primero con el botón "Nuevo hallazgo"</p>
            </div>
          ) : (
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
                  {["Fecha", "Activo", "Tipo", "Severidad", "Estado", ""].map(h => (
                    <th key={h} style={{
                      padding: "12px 16px", textAlign: "left", fontSize: 11,
                      color: "#6b6b94", textTransform: "uppercase",
                      letterSpacing: "0.07em", fontWeight: 500,
                    }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {recientes.map((h, i) => (
                  <tr key={h.id} style={{
                    borderBottom: "1px solid rgba(255,255,255,0.04)",
                    background: i % 2 === 0 ? "transparent" : "rgba(255,255,255,0.01)",
                  }}>
                    <td style={{ padding: "12px 16px", fontSize: 13, color: "#9999bb" }}>{h.fecha}</td>
                    <td style={{ padding: "12px 16px", fontSize: 13, fontWeight: 500 }}>{h.activo}</td>
                    <td style={{ padding: "12px 16px", fontSize: 13, color: "#9999bb" }}>{h.tipo}</td>
                    <td style={{ padding: "12px 16px" }}>
                      <span style={{
                        background: `${colorSeveridad[h.severidad]}22`,
                        border: `1px solid ${colorSeveridad[h.severidad]}44`,
                        color: colorSeveridad[h.severidad],
                        borderRadius: 100, padding: "3px 10px", fontSize: 12,
                      }}>{h.severidad}</span>
                    </td>
                    <td style={{ padding: "12px 16px" }}>
                      <span style={{
                        background: `${colorEstado[h.estado]}22`,
                        border: `1px solid ${colorEstado[h.estado]}44`,
                        color: colorEstado[h.estado],
                        borderRadius: 100, padding: "3px 10px", fontSize: 12,
                      }}>{h.estado}</span>
                    </td>
                    <td style={{ padding: "12px 16px" }}>
                      <button onClick={() => router.push(`/panel-admin/hallazgos/${h.id}`)} style={{
                        background: "rgba(99,102,241,0.1)", border: "1px solid rgba(99,102,241,0.2)",
                        borderRadius: 6, padding: "5px 12px", color: "#a5b4fc",
                        fontSize: 12, cursor: "pointer", fontFamily: "inherit",
                      }}>Ver</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </main>
    </div>
  );
}
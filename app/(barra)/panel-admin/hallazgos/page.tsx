"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { collection, getDocs, deleteDoc, doc, query, orderBy } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/lib/auth-context";
import { addDoc, serverTimestamp } from "firebase/firestore";

// ── Tipos ────────────────────────────────────────────────────
type Severidad = "Crítica" | "Alta" | "Media" | "Baja" | "";
type Estado    = "Nuevo" | "En análisis" | "En remediación" | "Mitigado" | "Cerrado" | "";

interface Hallazgo {
  id:            string;
  fecha:         string;
  activo:        string;
  tipo:          string;
  severidad:     Severidad;
  estado:        Estado;
  descripcion:   string;
  evidencia:     string;
  recomendacion: string;
  nombreCreador: string;
  creadoEn:      any;
}

// ── Colores por severidad y estado ───────────────────────────
const colorSeveridad: Record<string, string> = {
  "Crítica": "#ef4444",
  "Alta":    "#f97316",
  "Media":   "#eab308",
  "Baja":    "#22c55e",
};

const colorEstado: Record<string, string> = {
  "Nuevo":           "#6366f1",
  "En análisis":     "#3b82f6",
  "En remediación":  "#f59e0b",
  "Mitigado":        "#10b981",
  "Cerrado":         "#6b7280",
};

async function registrarAuditoria(usuario: string, accion: string, detalle: string) {
  await addDoc(collection(db, "audit_logs"), {
    usuario, accion, detalle, timestamp: serverTimestamp(),
  });
}

// ── Componente ───────────────────────────────────────────────
export default function HallazgosAdmin() {
  const { user, nombre, rol, loading: authLoading } = useAuth();
  const router = useRouter();

  const [hallazgos,    setHallazgos]    = useState<Hallazgo[]>([]);
  const [loading,      setLoading]      = useState(true);
  const [eliminando,   setEliminando]   = useState<string | null>(null);

  // Filtros
  const [filtroSeveridad, setFiltroSeveridad] = useState<Severidad>("");
  const [filtroEstado,    setFiltroEstado]    = useState<Estado>("");
  const [filtroActivo,    setFiltroActivo]    = useState("");
  const [filtroDesde,     setFiltroDesde]     = useState("");
  const [filtroHasta,     setFiltroHasta]     = useState("");

  // Protección de ruta
  useEffect(() => {
    if (!authLoading && !user) router.push("/login");
  }, [user, authLoading]);

  // Cargar hallazgos desde Firestore
  useEffect(() => {
    async function cargar() {
      try {
        const q = query(collection(db, "findings"), orderBy("creadoEn", "desc"));
        const snap = await getDocs(q);
        const datos = snap.docs.map(d => ({ id: d.id, ...d.data() })) as Hallazgo[];
        setHallazgos(datos);
      } catch (e) {
        console.error("Error cargando hallazgos:", e);
      } finally {
        setLoading(false);
      }
    }
    if (user) cargar();
  }, [user]);

  // Filtrar en frontend
  const hallazgosFiltrados = hallazgos.filter(h => {
    if (filtroSeveridad && h.severidad !== filtroSeveridad) return false;
    if (filtroEstado    && h.estado    !== filtroEstado)    return false;
    if (filtroActivo    && !h.activo.toLowerCase().includes(filtroActivo.toLowerCase())) return false;
    if (filtroDesde     && h.fecha < filtroDesde)           return false;
    if (filtroHasta     && h.fecha > filtroHasta)           return false;
    return true;
  });

  // Eliminar hallazgo
  async function handleEliminar(id: string, activo: string) {
    if (!confirm("¿Seguro que deseas eliminar este hallazgo?")) return;
    setEliminando(id);
    try {
      await deleteDoc(doc(db, "findings", id));
      await registrarAuditoria(
        nombre ?? user?.uid ?? "desconocido",
        "ELIMINAR_HALLAZGO",
        `Hallazgo eliminado — ID: ${id} — Activo: ${activo}`
      );
      setHallazgos(prev => prev.filter(h => h.id !== id));
    } catch (e) {
      console.error("Error eliminando:", e);
    } finally {
      setEliminando(null);
    }
  }

  const selectStyle: React.CSSProperties = {
    background: "rgba(255,255,255,0.05)",
    border: "1px solid rgba(255,255,255,0.1)",
    borderRadius: 8, padding: "7px 12px",
    color: "#e8e8f0", fontSize: 13, fontFamily: "inherit", cursor: "pointer",
  };

  const inputStyle: React.CSSProperties = {
    background: "rgba(255,255,255,0.05)",
    border: "1px solid rgba(255,255,255,0.1)",
    borderRadius: 8, padding: "7px 12px",
    color: "#e8e8f0", fontSize: 13, fontFamily: "inherit",
  };

  if (authLoading || loading) return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#0a0a0f", color: "#818cf8" }}>
      Cargando hallazgos...
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
          <button onClick={() => router.push("/panel-admin")} style={{
            background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)",
            borderRadius: 8, padding: "6px 14px", color: "#e8e8f0",
            fontSize: 13, cursor: "pointer", fontFamily: "inherit",
          }}>← Volver</button>
          <span style={{ fontWeight: 600, fontSize: 15 }}>Hallazgos</span>
          <span style={{
            background: "rgba(99,102,241,0.15)", border: "1px solid rgba(99,102,241,0.3)",
            borderRadius: 100, padding: "2px 10px", fontSize: 11, color: "#a5b4fc",
          }}>{hallazgosFiltrados.length} registros</span>
        </div>
        <button onClick={() => router.push("/panel-admin/hallazgos/nuevo")} style={{
          background: "linear-gradient(135deg, #6366f1, #818cf8)", border: "none",
          borderRadius: 8, padding: "7px 16px", color: "#fff",
          fontSize: 13, fontWeight: 500, cursor: "pointer", fontFamily: "inherit",
        }}>+ Nuevo hallazgo</button>
      </nav>

      <main style={{ padding: "2rem", maxWidth: 1200, margin: "0 auto" }}>

        {/* Filtros */}
        <div style={{
          background: "rgba(15,15,22,0.85)", border: "1px solid rgba(255,255,255,0.07)",
          borderRadius: 12, padding: "1.25rem 1.5rem", marginBottom: "1.5rem",
        }}>
          <p style={{ fontSize: 12, color: "#6b6b94", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: "1rem" }}>Filtros</p>
          <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap", alignItems: "center" }}>
            <select value={filtroSeveridad} onChange={e => setFiltroSeveridad(e.target.value as Severidad)} style={selectStyle}>
              <option value="">Todas las severidades</option>
              <option value="Crítica">🔴 Crítica</option>
              <option value="Alta">🟠 Alta</option>
              <option value="Media">🟡 Media</option>
              <option value="Baja">🟢 Baja</option>
            </select>
            <select value={filtroEstado} onChange={e => setFiltroEstado(e.target.value as Estado)} style={selectStyle}>
              <option value="">Todos los estados</option>
              <option value="Nuevo">Nuevo</option>
              <option value="En análisis">En análisis</option>
              <option value="En remediación">En remediación</option>
              <option value="Mitigado">Mitigado</option>
              <option value="Cerrado">Cerrado</option>
            </select>
            <input placeholder="Buscar activo..." value={filtroActivo}
              onChange={e => setFiltroActivo(e.target.value)} style={inputStyle} />
            <input type="date" value={filtroDesde}
              onChange={e => setFiltroDesde(e.target.value)} style={inputStyle} />
            <input type="date" value={filtroHasta}
              onChange={e => setFiltroHasta(e.target.value)} style={inputStyle} />
            <button onClick={() => {
              setFiltroSeveridad(""); setFiltroEstado("");
              setFiltroActivo(""); setFiltroDesde(""); setFiltroHasta("");
            }} style={{
              background: "none", border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: 8, padding: "7px 14px", color: "#6b6b94",
              fontSize: 13, cursor: "pointer", fontFamily: "inherit",
            }}>Limpiar</button>
          </div>
        </div>

        {/* Tabla */}
        <div style={{
          background: "rgba(15,15,22,0.85)", border: "1px solid rgba(255,255,255,0.07)",
          borderRadius: 12, overflow: "hidden",
        }}>
          {hallazgosFiltrados.length === 0 ? (
            <div style={{ padding: "3rem", textAlign: "center", color: "#44445e" }}>
              <p style={{ fontSize: 14 }}>No hay hallazgos que coincidan con los filtros.</p>
            </div>
          ) : (
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
                  {["Fecha", "Activo", "Tipo", "Severidad", "Estado", "Creado por", "Acciones"].map(h => (
                    <th key={h} style={{
                      padding: "12px 16px", textAlign: "left",
                      fontSize: 11, color: "#6b6b94", textTransform: "uppercase",
                      letterSpacing: "0.07em", fontWeight: 500,
                    }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {hallazgosFiltrados.map((h, i) => (
                  <tr key={h.id} style={{
                    borderBottom: "1px solid rgba(255,255,255,0.04)",
                    background: i % 2 === 0 ? "transparent" : "rgba(255,255,255,0.01)",
                  }}>
                    <td style={{ padding: "12px 16px", fontSize: 13, color: "#9999bb" }}>{h.fecha}</td>
                    <td style={{ padding: "12px 16px", fontSize: 13, fontWeight: 500 }}>{h.activo}</td>
                    <td style={{ padding: "12px 16px", fontSize: 13, color: "#9999bb" }}>{h.tipo}</td>
                    <td style={{ padding: "12px 16px" }}>
                      <span style={{
                        background: `${colorSeveridad[h.severidad] || "#888"}22`,
                        border: `1px solid ${colorSeveridad[h.severidad] || "#888"}44`,
                        color: colorSeveridad[h.severidad] || "#888",
                        borderRadius: 100, padding: "3px 10px", fontSize: 12,
                      }}>{h.severidad}</span>
                    </td>
                    <td style={{ padding: "12px 16px" }}>
                      <span style={{
                        background: `${colorEstado[h.estado] || "#888"}22`,
                        border: `1px solid ${colorEstado[h.estado] || "#888"}44`,
                        color: colorEstado[h.estado] || "#888",
                        borderRadius: 100, padding: "3px 10px", fontSize: 12,
                      }}>{h.estado}</span>
                    </td>
                    <td style={{ padding: "12px 16px", fontSize: 13, color: "#9999bb" }}>{h.nombreCreador}</td>
                    <td style={{ padding: "12px 16px" }}>
                      <div style={{ display: "flex", gap: "8px" }}>
                        <button onClick={() => router.push(`/panel-admin/hallazgos/${h.id}`)} style={{
                          background: "rgba(99,102,241,0.1)", border: "1px solid rgba(99,102,241,0.2)",
                          borderRadius: 6, padding: "5px 12px", color: "#a5b4fc",
                          fontSize: 12, cursor: "pointer", fontFamily: "inherit",
                        }}>Ver</button>
                        {rol === "admin" && (
                          <button
                            onClick={() => handleEliminar(h.id, h.activo)}
                            disabled={eliminando === h.id}
                            style={{
                              background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)",
                              borderRadius: 6, padding: "5px 12px", color: "#f87171",
                              fontSize: 12, cursor: "pointer", fontFamily: "inherit",
                              opacity: eliminando === h.id ? 0.5 : 1,
                            }}>{eliminando === h.id ? "..." : "Eliminar"}</button>
                        )}
                      </div>
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
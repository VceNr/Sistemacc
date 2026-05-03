"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { collection, getDocs, query, orderBy } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/lib/auth-context";

interface LogAuditoria {
  id:        string;
  usuario:   string;
  accion:    string;
  detalle:   string;
  timestamp: any;
}

const colorAccion: Record<string, string> = {
  "CREAR_HALLAZGO":   "#10b981",
  "EDITAR_HALLAZGO":  "#3b82f6",
  "ELIMINAR_HALLAZGO":"#ef4444",
  "CAMBIO_ESTADO":    "#f59e0b",
  "LOGIN":            "#6366f1",
  "LOGOUT":           "#6b7280",
};

export default function Auditoria() {
  const { user, nombre, rol, loading: authLoading } = useAuth();
  const router = useRouter();

  const [logs,    setLogs]    = useState<LogAuditoria[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtroAccion, setFiltroAccion] = useState("");
  const [filtroUsuario, setFiltroUsuario] = useState("");

  // Protección — solo admin
  useEffect(() => {
    if (!authLoading) {
      if (!user) router.push("/login");
      if (rol !== null && rol !== "admin") router.push("/panel-analista");
    }
  }, [user, rol, authLoading]);

  // Cargar logs
  useEffect(() => {
    async function cargar() {
      try {
        const q = query(collection(db, "audit_logs"), orderBy("timestamp", "desc"));
        const snap = await getDocs(q);
        setLogs(snap.docs.map(d => ({ id: d.id, ...d.data() })) as LogAuditoria[]);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
    if (user) cargar();
  }, [user]);

  // Filtrar en frontend
  const logsFiltrados = logs.filter(l => {
    if (filtroAccion  && l.accion  !== filtroAccion)                          return false;
    if (filtroUsuario && !l.usuario.toLowerCase().includes(filtroUsuario.toLowerCase())) return false;
    return true;
  });

  function formatFecha(timestamp: any) {
    if (!timestamp) return "—";
    const fecha = timestamp.toDate?.() ?? new Date(timestamp);
    return fecha.toLocaleString("es-CL");
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
      Cargando auditoría...
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
          <span style={{ fontWeight: 600, fontSize: 15 }}>Auditoría del sistema</span>
          <span style={{
            background: "rgba(99,102,241,0.15)", border: "1px solid rgba(99,102,241,0.3)",
            borderRadius: 100, padding: "2px 10px", fontSize: 11, color: "#a5b4fc",
          }}>{logsFiltrados.length} eventos</span>
        </div>
        <span style={{ fontSize: 13, color: "#64648a" }}>
          {nombre} — <span style={{ color: "#a5b4fc" }}>admin</span>
        </span>
      </nav>

      <main style={{ padding: "2rem", maxWidth: 1200, margin: "0 auto" }}>

        {/* Filtros */}
        <div style={{
          background: "rgba(15,15,22,0.85)", border: "1px solid rgba(255,255,255,0.07)",
          borderRadius: 12, padding: "1.25rem 1.5rem", marginBottom: "1.5rem",
        }}>
          <p style={{ fontSize: 12, color: "#6b6b94", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: "1rem" }}>Filtros</p>
          <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap", alignItems: "center" }}>
            <select value={filtroAccion} onChange={e => setFiltroAccion(e.target.value)} style={selectStyle}>
              <option value="">Todas las acciones</option>
              <option value="CREAR_HALLAZGO">Crear hallazgo</option>
              <option value="EDITAR_HALLAZGO">Editar hallazgo</option>
              <option value="ELIMINAR_HALLAZGO">Eliminar hallazgo</option>
              <option value="CAMBIO_ESTADO">Cambio de estado</option>
              <option value="LOGIN">Login</option>
              <option value="LOGOUT">Logout</option>
            </select>
            <input placeholder="Buscar usuario..." value={filtroUsuario}
              onChange={e => setFiltroUsuario(e.target.value)} style={inputStyle} />
            <button onClick={() => { setFiltroAccion(""); setFiltroUsuario(""); }} style={{
              background: "none", border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: 8, padding: "7px 14px", color: "#6b6b94",
              fontSize: 13, cursor: "pointer", fontFamily: "inherit",
            }}>Limpiar</button>
          </div>
        </div>

        {/* Tabla de logs */}
        <div style={{
          background: "rgba(15,15,22,0.85)", border: "1px solid rgba(255,255,255,0.07)",
          borderRadius: 12, overflow: "hidden",
        }}>
          {logsFiltrados.length === 0 ? (
            <div style={{ padding: "3rem", textAlign: "center", color: "#44445e", fontSize: 14 }}>
              No hay eventos registrados.
            </div>
          ) : (
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
                  {["Fecha y hora", "Usuario", "Acción", "Detalle"].map(h => (
                    <th key={h} style={{
                      padding: "12px 16px", textAlign: "left", fontSize: 11,
                      color: "#6b6b94", textTransform: "uppercase",
                      letterSpacing: "0.07em", fontWeight: 500,
                    }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {logsFiltrados.map((log, i) => (
                  <tr key={log.id} style={{
                    borderBottom: "1px solid rgba(255,255,255,0.04)",
                    background: i % 2 === 0 ? "transparent" : "rgba(255,255,255,0.01)",
                  }}>
                    <td style={{ padding: "12px 16px", fontSize: 12, color: "#9999bb", whiteSpace: "nowrap" }}>
                      {formatFecha(log.timestamp)}
                    </td>
                    <td style={{ padding: "12px 16px", fontSize: 13, fontWeight: 500 }}>
                      {log.usuario}
                    </td>
                    <td style={{ padding: "12px 16px" }}>
                      <span style={{
                        background: `${colorAccion[log.accion] || "#888"}22`,
                        border: `1px solid ${colorAccion[log.accion] || "#888"}44`,
                        color: colorAccion[log.accion] || "#888",
                        borderRadius: 100, padding: "3px 10px", fontSize: 11,
                        whiteSpace: "nowrap",
                      }}>{log.accion.replace(/_/g, " ")}</span>
                    </td>
                    <td style={{ padding: "12px 16px", fontSize: 13, color: "#9999bb" }}>
                      {log.detalle}
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
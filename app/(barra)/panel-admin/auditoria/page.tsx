"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { getAuditLogs, type LogAuditoria } from "@/lib/api";

type Accion = "CREAR_HALLAZGO" | "EDITAR_HALLAZGO" | "ELIMINAR_HALLAZGO" | "CAMBIO_ESTADO" | "LOGIN" | "LOGOUT";

const ACCIONES: { valor: Accion; label: string }[] = [
  { valor: "CREAR_HALLAZGO",    label: "Crear hallazgo"    },
  { valor: "EDITAR_HALLAZGO",   label: "Editar hallazgo"   },
  { valor: "ELIMINAR_HALLAZGO", label: "Eliminar hallazgo" },
  { valor: "CAMBIO_ESTADO",     label: "Cambio de estado"  },
  { valor: "LOGIN",             label: "Login"             },
  { valor: "LOGOUT",            label: "Logout"            },
];

const colorAccion: Record<string, string> = {
  "CREAR_HALLAZGO":    "#10b981",
  "EDITAR_HALLAZGO":   "#3b82f6",
  "ELIMINAR_HALLAZGO": "#ef4444",
  "CAMBIO_ESTADO":     "#f59e0b",
  "LOGIN":             "#6366f1",
  "LOGOUT":            "#6b7280",
};

interface Filtros {
  acciones: Set<Accion>;
  usuario:  string;
  desde:    string;
  hasta:    string;
}

const filtrosVacios = (): Filtros => ({
  acciones: new Set(),
  usuario:  "",
  desde:    "",
  hasta:    "",
});

export default function Auditoria() {
  const { user, nombre, rol, loading: authLoading } = useAuth();
  const router = useRouter();

  const [logs,         setLogs]         = useState<LogAuditoria[]>([]);
  const [loading,      setLoading]      = useState(true);
  const [filtros,      setFiltros]      = useState<Filtros>(filtrosVacios());
  const [panelAbierto, setPanelAbierto] = useState(false);

  useEffect(() => {
    if (!authLoading) {
      if (!user)              router.push("/login");
      if (rol && rol !== "admin") router.push("/panel-admin");
    }
  }, [user, rol, authLoading, router]);

  useEffect(() => {
    if (!user) return;
    getAuditLogs()
      .then(setLogs)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [user]);

  function toggleAccion(a: Accion) {
    setFiltros(prev => {
      const next = new Set(prev.acciones);
      next.has(a) ? next.delete(a) : next.add(a);
      return { ...prev, acciones: next };
    });
  }

  const logsFiltrados = logs.filter(l => {
    if (filtros.acciones.size > 0 && !filtros.acciones.has(l.accion as Accion)) return false;
    if (filtros.usuario && !l.usuario.toLowerCase().includes(filtros.usuario.toLowerCase())) return false;
    if (filtros.desde || filtros.hasta) {
      const fecha = l.timestamp?.toDate?.() ?? new Date(l.timestamp);
      const iso   = fecha.toISOString().split("T")[0];
      if (filtros.desde && iso < filtros.desde) return false;
      if (filtros.hasta && iso > filtros.hasta) return false;
    }
    return true;
  });

  const chipsActivos = filtros.acciones.size + (filtros.usuario ? 1 : 0);
  const totalActivos = chipsActivos + (filtros.desde ? 1 : 0) + (filtros.hasta ? 1 : 0);

  function formatFecha(timestamp: any): string {
    if (!timestamp) return "—";
    const fecha = timestamp.toDate?.() ?? new Date(timestamp);
    return fecha.toLocaleString("es-CL");
  }

  const dateInputStyle = (activo: boolean): React.CSSProperties => ({
    background: activo ? "rgba(99,102,241,0.08)" : "rgba(255,255,255,0.03)",
    border: `1px solid ${activo ? "rgba(99,102,241,0.3)" : "rgba(255,255,255,0.08)"}`,
    borderRadius: 8, padding: "7px 12px",
    color: "#e8e8f0", fontSize: 13, fontFamily: "inherit",
    outline: "none", colorScheme: "dark" as any,
  });

  if (authLoading || loading) return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#0a0a0f", color: "#818cf8" }}>
      Cargando auditoría...
    </div>
  );

  return (
    <div style={{ minHeight: "100vh", background: "#0a0a0f", color: "#f0f0f5", fontFamily: "DM Sans, sans-serif" }}>

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

        {/* Barra de controles */}
        <div style={{ display: "flex", alignItems: "center", gap: "1rem", marginBottom: "1.5rem", flexWrap: "wrap" }}>

          {/* Botón Filtros + dropdown */}
          <div style={{ position: "relative", zIndex: 30 }}>
            <button
              onClick={() => setPanelAbierto(prev => !prev)}
              style={{
                display: "flex", alignItems: "center", gap: "8px",
                background: panelAbierto || chipsActivos > 0 ? "rgba(99,102,241,0.12)" : "rgba(255,255,255,0.05)",
                border: `1px solid ${panelAbierto || chipsActivos > 0 ? "rgba(99,102,241,0.35)" : "rgba(255,255,255,0.1)"}`,
                borderRadius: 8, padding: "7px 14px",
                color: panelAbierto || chipsActivos > 0 ? "#a5b4fc" : "#e8e8f0",
                fontSize: 13, cursor: "pointer", fontFamily: "inherit", transition: "all 0.15s",
              }}
            >
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path d="M1 3h12M3 7h8M5 11h4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
              Filtros
              {chipsActivos > 0 && (
                <span style={{
                  background: "#6366f1", borderRadius: 100,
                  width: 18, height: 18, fontSize: 10, fontWeight: 700,
                  display: "flex", alignItems: "center", justifyContent: "center", color: "#fff",
                }}>{chipsActivos}</span>
              )}
              <span style={{
                fontSize: 10, opacity: 0.6,
                transform: panelAbierto ? "rotate(180deg)" : "rotate(0deg)",
                transition: "transform 0.2s", display: "inline-block",
              }}>▼</span>
            </button>

            {/* Dropdown flotante */}
            {panelAbierto && (
              <div style={{
                position: "absolute", top: "calc(100% + 8px)", left: 0,
                background: "rgba(13,13,20,0.98)", border: "1px solid rgba(255,255,255,0.09)",
                borderRadius: 12, padding: "1.25rem 1.5rem",
                boxShadow: "0 16px 48px rgba(0,0,0,0.6)",
                zIndex: 30, minWidth: 420,
              }}>

                {/* Cabecera */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.1rem" }}>
                  <span style={{ fontSize: 11, color: "#6b6b94", textTransform: "uppercase", letterSpacing: "0.07em" }}>Filtros</span>
                  {chipsActivos > 0 && (
                    <button
                      onClick={() => setFiltros(prev => ({ ...prev, acciones: new Set(), usuario: "" }))}
                      style={{ background: "none", border: "none", color: "#6b6b94", fontSize: 12, cursor: "pointer", fontFamily: "inherit", padding: 0 }}
                    >Limpiar</button>
                  )}
                </div>

                {/* Acción — chips multi-toggle */}
                <div style={{ marginBottom: "1rem" }}>
                  <p style={{ fontSize: 11, color: "#44445e", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "0.6rem" }}>
                    Acción
                  </p>
                  <div style={{ display: "flex", gap: "7px", flexWrap: "wrap" }}>
                    {ACCIONES.map(({ valor, label }) => {
                      const on    = filtros.acciones.has(valor);
                      const color = colorAccion[valor];
                      return (
                        <button key={valor} onClick={() => toggleAccion(valor)} style={{
                          background: on ? `${color}22` : "rgba(255,255,255,0.03)",
                          border: `1px solid ${on ? color + "66" : "rgba(255,255,255,0.08)"}`,
                          borderRadius: 7, padding: "6px 14px",
                          color: on ? color : "#6b6b94",
                          fontSize: 13, cursor: "pointer", fontFamily: "inherit",
                          fontWeight: on ? 600 : 400, transition: "all 0.15s",
                        }}>
                          {label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div style={{ height: 1, background: "rgba(255,255,255,0.05)", marginBottom: "1rem" }} />

                {/* Usuario */}
                <div>
                  <p style={{ fontSize: 11, color: "#44445e", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "0.6rem" }}>
                    Usuario
                  </p>
                  <input
                    placeholder="Buscar usuario..."
                    value={filtros.usuario}
                    onChange={e => setFiltros(prev => ({ ...prev, usuario: e.target.value }))}
                    style={{
                      width: "100%", boxSizing: "border-box",
                      background: filtros.usuario ? "rgba(99,102,241,0.08)" : "rgba(255,255,255,0.03)",
                      border: `1px solid ${filtros.usuario ? "rgba(99,102,241,0.3)" : "rgba(255,255,255,0.08)"}`,
                      borderRadius: 8, padding: "7px 12px",
                      color: "#e8e8f0", fontSize: 13, fontFamily: "inherit", outline: "none",
                    }}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Fechas — siempre visibles */}
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <span style={{ fontSize: 12, color: "#44445e" }}>Desde</span>
            <input type="date" value={filtros.desde}
              onChange={e => setFiltros(prev => ({ ...prev, desde: e.target.value }))}
              style={dateInputStyle(!!filtros.desde)} />
            <span style={{ fontSize: 12, color: "#44445e" }}>Hasta</span>
            <input type="date" value={filtros.hasta}
              onChange={e => setFiltros(prev => ({ ...prev, hasta: e.target.value }))}
              style={dateInputStyle(!!filtros.hasta)} />
          </div>

          {/* Limpiar todo */}
          {totalActivos > 0 && (
            <button onClick={() => setFiltros(filtrosVacios())} style={{
              background: "none", border: "1px solid rgba(255,255,255,0.08)",
              borderRadius: 8, padding: "7px 12px", color: "#6b6b94",
              fontSize: 12, cursor: "pointer", fontFamily: "inherit",
            }}>Limpiar todo</button>
          )}
        </div>

        {/* Tabla */}
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
                    <td style={{ padding: "12px 16px", fontSize: 13, fontWeight: 500 }}>{log.usuario}</td>
                    <td style={{ padding: "12px 16px" }}>
                      <span style={{
                        background: `${colorAccion[log.accion] || "#888"}22`,
                        border: `1px solid ${colorAccion[log.accion] || "#888"}44`,
                        color: colorAccion[log.accion] || "#888",
                        borderRadius: 100, padding: "3px 10px", fontSize: 11, whiteSpace: "nowrap",
                      }}>{log.accion.replace(/_/g, " ")}</span>
                    </td>
                    <td style={{ padding: "12px 16px", fontSize: 13, color: "#9999bb" }}>{log.detalle}</td>
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

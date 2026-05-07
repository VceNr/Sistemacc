"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import {
  getHallazgos, deleteHallazgo, registrarAuditoria,
  type Hallazgo, type Severidad, type Estado,
} from "@/lib/api";

const SEVERIDADES: Severidad[] = ["Crítica", "Alta", "Media", "Baja"];
const ESTADOS:     Estado[]    = ["Nuevo", "En análisis", "En remediación", "Mitigado", "Cerrado"];

const colorSeveridad: Record<string, string> = {
  "Crítica": "#ef4444", "Alta": "#f97316",
  "Media":   "#eab308", "Baja": "#22c55e",
};

const colorEstado: Record<string, string> = {
  "Nuevo":          "#6366f1", "En análisis":    "#3b82f6",
  "En remediación": "#f59e0b", "Mitigado":       "#10b981",
  "Cerrado":        "#6b7280",
};

const emojiSeveridad: Record<string, string> = {
  "Crítica": "🔴", "Alta": "🟠", "Media": "🟡", "Baja": "🟢",
};

interface Filtros {
  severidades: Set<Severidad>;
  estados:     Set<Estado>;
  activo:      string;
  desde:       string;
  hasta:       string;
}

const filtrosVacios = (): Filtros => ({
  severidades: new Set(),
  estados:     new Set(),
  activo:      "",
  desde:       "",
  hasta:       "",
});

export default function HallazgosAdmin() {
  const { user, nombre, rol, loading: authLoading } = useAuth();
  const router = useRouter();

  const [hallazgos,    setHallazgos]    = useState<Hallazgo[]>([]);
  const [loading,      setLoading]      = useState(true);
  const [eliminando,   setEliminando]   = useState<string | null>(null);
  const [filtros,      setFiltros]      = useState<Filtros>(filtrosVacios());
  const [panelAbierto, setPanelAbierto] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) router.push("/login");
  }, [user, authLoading]);

  useEffect(() => {
    if (!user) return;
    getHallazgos()
      .then(setHallazgos)
      .catch(e => console.error("Error cargando hallazgos:", e))
      .finally(() => setLoading(false));
  }, [user]);

  function toggleSeveridad(s: Severidad) {
    setFiltros(prev => {
      const next = new Set(prev.severidades);
      next.has(s) ? next.delete(s) : next.add(s);
      return { ...prev, severidades: next };
    });
  }

  function toggleEstado(e: Estado) {
    setFiltros(prev => {
      const next = new Set(prev.estados);
      next.has(e) ? next.delete(e) : next.add(e);
      return { ...prev, estados: next };
    });
  }

  const hallazgosFiltrados = hallazgos.filter(h => {
    if (filtros.severidades.size > 0 && !filtros.severidades.has(h.severidad)) return false;
    if (filtros.estados.size     > 0 && !filtros.estados.has(h.estado))        return false;
    if (filtros.activo && !h.activo.toLowerCase().includes(filtros.activo.toLowerCase())) return false;
    if (filtros.desde  && h.fecha < filtros.desde) return false;
    if (filtros.hasta  && h.fecha > filtros.hasta) return false;
    return true;
  });

  const chipsActivos = filtros.severidades.size + filtros.estados.size + (filtros.activo ? 1 : 0);
  const totalActivos = chipsActivos + (filtros.desde ? 1 : 0) + (filtros.hasta ? 1 : 0);

  async function handleEliminar(id: string, activo: string) {
    if (!confirm("¿Seguro que deseas eliminar este hallazgo?")) return;
    setEliminando(id);
    try {
      await deleteHallazgo(id);
      await registrarAuditoria(
        nombre ?? user?.uid ?? "desconocido",
        "ELIMINAR_HALLAZGO",
        `Hallazgo eliminado — ID: ${id} — Activo: ${activo}`,
      );
      setHallazgos(prev => prev.filter(h => h.id !== id));
    } catch (e) {
      console.error("Error eliminando:", e);
    } finally {
      setEliminando(null);
    }
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
                      onClick={() => setFiltros(prev => ({ ...prev, severidades: new Set(), estados: new Set(), activo: "" }))}
                      style={{ background: "none", border: "none", color: "#6b6b94", fontSize: 12, cursor: "pointer", fontFamily: "inherit", padding: 0 }}
                    >Limpiar</button>
                  )}
                </div>

                {/* Severidad */}
                <div style={{ marginBottom: "1rem" }}>
                  <p style={{ fontSize: 11, color: "#44445e", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "0.6rem" }}>
                    Severidad
                  </p>
                  <div style={{ display: "flex", gap: "7px", flexWrap: "wrap" }}>
                    {SEVERIDADES.map(s => {
                      const on    = filtros.severidades.has(s);
                      const color = colorSeveridad[s];
                      return (
                        <button key={s} onClick={() => toggleSeveridad(s)} style={{
                          background: on ? `${color}22` : "rgba(255,255,255,0.03)",
                          border: `1px solid ${on ? color + "66" : "rgba(255,255,255,0.08)"}`,
                          borderRadius: 7, padding: "6px 14px",
                          color: on ? color : "#6b6b94",
                          fontSize: 13, cursor: "pointer", fontFamily: "inherit",
                          fontWeight: on ? 600 : 400, transition: "all 0.15s",
                        }}>
                          {emojiSeveridad[s]} {s}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div style={{ height: 1, background: "rgba(255,255,255,0.05)", marginBottom: "1rem" }} />

                {/* Estado */}
                <div style={{ marginBottom: "1rem" }}>
                  <p style={{ fontSize: 11, color: "#44445e", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "0.6rem" }}>
                    Estado
                  </p>
                  <div style={{ display: "flex", gap: "7px", flexWrap: "wrap" }}>
                    {ESTADOS.map(e => {
                      const on    = filtros.estados.has(e);
                      const color = colorEstado[e];
                      return (
                        <button key={e} onClick={() => toggleEstado(e)} style={{
                          background: on ? `${color}22` : "rgba(255,255,255,0.03)",
                          border: `1px solid ${on ? color + "66" : "rgba(255,255,255,0.08)"}`,
                          borderRadius: 7, padding: "6px 14px",
                          color: on ? color : "#6b6b94",
                          fontSize: 13, cursor: "pointer", fontFamily: "inherit",
                          fontWeight: on ? 600 : 400, transition: "all 0.15s",
                        }}>
                          {e}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div style={{ height: 1, background: "rgba(255,255,255,0.05)", marginBottom: "1rem" }} />

                {/* Activo */}
                <div>
                  <p style={{ fontSize: 11, color: "#44445e", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "0.6rem" }}>
                    Activo
                  </p>
                  <input
                    placeholder="Buscar activo..."
                    value={filtros.activo}
                    onChange={e => setFiltros(prev => ({ ...prev, activo: e.target.value }))}
                    style={{
                      width: "100%", boxSizing: "border-box",
                      background: filtros.activo ? "rgba(99,102,241,0.08)" : "rgba(255,255,255,0.03)",
                      border: `1px solid ${filtros.activo ? "rgba(99,102,241,0.3)" : "rgba(255,255,255,0.08)"}`,
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
                        {(rol === "admin" || h.nombreCreador === nombre) && (
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

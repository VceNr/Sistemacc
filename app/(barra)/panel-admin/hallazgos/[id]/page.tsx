"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import {
  getHallazgo, updateHallazgo, getHistorialHallazgo,
  registrarAuditoria, registrarHistorial,
  type Hallazgo, type HistorialItem, type Estado,
} from "@/lib/api";

const colorSeveridad: Record<string, string> = {
  "Crítica": "#ef4444", "Alta": "#f97316",
  "Media":   "#eab308", "Baja": "#22c55e",
};

const colorEstado: Record<string, string> = {
  "Nuevo":          "#6366f1", "En análisis":    "#3b82f6",
  "En remediación": "#f59e0b", "Mitigado":       "#10b981",
  "Cerrado":        "#6b7280",
};

export default function DetalleHallazgo() {
  const { user, nombre, rol, loading: authLoading } = useAuth();
  const router = useRouter();
  const params = useParams();
  const id     = params.id as string;

  const [hallazgo,      setHallazgo]      = useState<Hallazgo | null>(null);
  const [historial,     setHistorial]     = useState<HistorialItem[]>([]);
  const [loading,       setLoading]       = useState(true);
  const [guardando,     setGuardando]     = useState(false);
  const [editando,      setEditando]      = useState(false);
  const [mensaje,       setMensaje]       = useState<string | null>(null);
  const [imagenAbierta, setImagenAbierta] = useState<string | null>(null);

  const [estadoEdit,   setEstadoEdit]   = useState<Estado>("Nuevo");
  const [descripEdit,  setDescripEdit]  = useState("");
  const [recomendEdit, setRecomendEdit] = useState("");

  const puedeEditar = rol === "admin" || hallazgo?.nombreCreador === nombre;

  useEffect(() => {
    if (!authLoading && !user) router.push("/login");
  }, [user, authLoading, router]);

  useEffect(() => {
    if (!user || !id) return;
    async function cargar() {
      try {
        const data = await getHallazgo(id);
        if (!data) { router.push("/panel-admin/hallazgos"); return; }
        setHallazgo(data);
        setEstadoEdit(data.estado);
        setDescripEdit(data.descripcion);
        setRecomendEdit(data.recomendacion);

        const items = await getHistorialHallazgo(id);
        setHistorial(items);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
    cargar();
  }, [user, id, router]);

  async function handleGuardar() {
    if (!hallazgo || !user) return;
    setGuardando(true);
    try {
      const cambios: Partial<Hallazgo> = {};
      const promesas: Promise<void>[]  = [];

      if (estadoEdit !== hallazgo.estado) {
        cambios.estado = estadoEdit;
        promesas.push(registrarHistorial(id, "estado", hallazgo.estado, estadoEdit, nombre ?? user.uid));
        promesas.push(registrarAuditoria(nombre ?? user.uid, "CAMBIO_ESTADO",
          `Hallazgo ${id} — Estado: ${hallazgo.estado} → ${estadoEdit}`));
      }
      if (descripEdit.trim() !== hallazgo.descripcion) {
        cambios.descripcion = descripEdit.trim();
        promesas.push(registrarHistorial(id, "descripcion", hallazgo.descripcion, descripEdit.trim(), nombre ?? user.uid));
      }
      if (recomendEdit.trim() !== hallazgo.recomendacion) {
        cambios.recomendacion = recomendEdit.trim();
        promesas.push(registrarHistorial(id, "recomendacion", hallazgo.recomendacion, recomendEdit.trim(), nombre ?? user.uid));
      }

      if (Object.keys(cambios).length > 0) {
        await updateHallazgo(id, cambios);
        await Promise.all(promesas);

        if (cambios.descripcion !== undefined || cambios.recomendacion !== undefined) {
          await registrarAuditoria(nombre ?? user.uid, "EDITAR_HALLAZGO", `Hallazgo editado — ID: ${id}`);
        }

        const items = await getHistorialHallazgo(id);
        setHistorial(items);
        setHallazgo(prev => prev ? { ...prev, ...cambios } : prev);
        setMensaje("Cambios guardados correctamente.");
      } else {
        setMensaje("No hay cambios que guardar.");
      }
      setEditando(false);
    } catch (e) {
      console.error(e);
      const msg = (e as any)?.message ?? "";
      setMensaje(
        msg.includes("index")
          ? "Cambios guardados. Crea el índice en Firebase para ver el historial."
          : "Error al guardar cambios.",
      );
    } finally {
      setGuardando(false);
    }
  }

  const inputStyle: React.CSSProperties = {
    width: "100%", background: "rgba(255,255,255,0.05)",
    border: "1px solid rgba(255,255,255,0.12)", borderRadius: 8,
    padding: "9px 12px", color: "#e8e8f0", fontSize: 14,
    fontFamily: "inherit", boxSizing: "border-box",
  };

  const labelStyle: React.CSSProperties = {
    display: "block", fontSize: 11, fontWeight: 500,
    letterSpacing: "0.07em", textTransform: "uppercase",
    color: "#6b6b94", marginBottom: 6,
  };

  if (authLoading || loading) return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#0a0a0f", color: "#818cf8" }}>
      Cargando...
    </div>
  );

  if (!hallazgo) return null;

  return (
    <div style={{ minHeight: "100vh", background: "#0a0a0f", color: "#f0f0f5", fontFamily: "DM Sans, sans-serif" }}>

      {/* Lightbox */}
      {imagenAbierta && (
        <div
          onClick={() => setImagenAbierta(null)}
          style={{
            position: "fixed", inset: 0, zIndex: 100,
            background: "rgba(0,0,0,0.85)", display: "flex",
            alignItems: "center", justifyContent: "center", cursor: "zoom-out",
          }}
        >
          <img
            src={imagenAbierta}
            alt="Evidencia ampliada"
            style={{ maxWidth: "90vw", maxHeight: "90vh", borderRadius: 12, objectFit: "contain" }}
          />
          <button
            onClick={() => setImagenAbierta(null)}
            style={{
              position: "absolute", top: 20, right: 24,
              background: "rgba(255,255,255,0.1)", border: "none",
              borderRadius: "50%", width: 36, height: 36,
              color: "#fff", fontSize: 18, cursor: "pointer",
            }}
          >✕</button>
        </div>
      )}

      {/* Navbar */}
      <nav style={{
        borderBottom: "1px solid rgba(255,255,255,0.07)", padding: "0 2rem",
        display: "flex", alignItems: "center", justifyContent: "space-between",
        height: "60px", background: "rgba(15,15,22,0.9)", backdropFilter: "blur(12px)",
        position: "sticky", top: 0, zIndex: 50,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <button onClick={() => router.back()} style={{
            background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)",
            borderRadius: 8, padding: "6px 14px", color: "#e8e8f0",
            fontSize: 13, cursor: "pointer", fontFamily: "inherit",
          }}>← Volver</button>
          <span style={{ fontWeight: 600, fontSize: 15 }}>Detalle del Hallazgo</span>
        </div>
        <span style={{ fontSize: 13, color: "#64648a" }}>
          {nombre} — <span style={{ color: "#a5b4fc" }}>{rol}</span>
        </span>
      </nav>

      <main style={{ padding: "2rem", maxWidth: 900, margin: "0 auto" }}>

        {mensaje && (
          <div style={{
            background: mensaje.includes("Error") ? "rgba(239,68,68,0.08)" : "rgba(16,185,129,0.08)",
            border: `1px solid ${mensaje.includes("Error") ? "rgba(239,68,68,0.2)" : "rgba(16,185,129,0.2)"}`,
            borderRadius: 10, padding: "12px 16px",
            color: mensaje.includes("Error") ? "#f87171" : "#34d399",
            fontSize: 14, marginBottom: "1.5rem",
          }}>{mensaje}</div>
        )}

        <div style={{
          background: "rgba(15,15,22,0.85)", border: "1px solid rgba(255,255,255,0.07)",
          borderRadius: 14, padding: "2rem", marginBottom: "1.5rem",
        }}>

          {/* Header */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "1.5rem" }}>
            <div>
              <p style={{ fontSize: 11, color: "#6b6b94", letterSpacing: "0.07em", textTransform: "uppercase", marginBottom: 6 }}>ID del hallazgo</p>
              <p style={{ fontSize: 12, color: "#a5b4fc", fontFamily: "monospace" }}>{hallazgo.id}</p>
            </div>
            <span style={{
              background: `${colorSeveridad[hallazgo.severidad]}22`,
              border: `1px solid ${colorSeveridad[hallazgo.severidad]}44`,
              color: colorSeveridad[hallazgo.severidad],
              borderRadius: 100, padding: "4px 14px", fontSize: 13,
            }}>{hallazgo.severidad}</span>
          </div>

          {/* Grid datos */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.5rem", marginBottom: "1.5rem" }}>
            <div><p style={labelStyle}>Fecha</p><p style={{ fontSize: 14 }}>{hallazgo.fecha}</p></div>
            <div><p style={labelStyle}>Activo afectado</p><p style={{ fontSize: 14, fontWeight: 600 }}>{hallazgo.activo}</p></div>
            <div><p style={labelStyle}>Tipo de vulnerabilidad</p><p style={{ fontSize: 14 }}>{hallazgo.tipo}</p></div>
            <div><p style={labelStyle}>Creado por</p><p style={{ fontSize: 14 }}>{hallazgo.nombreCreador}</p></div>
          </div>

          {/* Estado */}
          <div style={{ marginBottom: "1.5rem" }}>
            <p style={labelStyle}>Estado</p>
            {editando ? (
              <select value={estadoEdit} onChange={e => setEstadoEdit(e.target.value as Estado)} style={{ ...inputStyle, width: "auto" }}>
                <option value="Nuevo">Nuevo</option>
                <option value="En análisis">En análisis</option>
                <option value="En remediación">En remediación</option>
                <option value="Mitigado">Mitigado</option>
                <option value="Cerrado">Cerrado</option>
              </select>
            ) : (
              <span style={{
                background: `${colorEstado[hallazgo.estado]}22`,
                border: `1px solid ${colorEstado[hallazgo.estado]}44`,
                color: colorEstado[hallazgo.estado],
                borderRadius: 100, padding: "4px 14px", fontSize: 13,
              }}>{hallazgo.estado}</span>
            )}
          </div>

          {/* Descripción */}
          <div style={{ marginBottom: "1.5rem" }}>
            <p style={labelStyle}>Descripción técnica</p>
            {editando ? (
              <textarea value={descripEdit} onChange={e => setDescripEdit(e.target.value)}
                rows={4} style={{ ...inputStyle, resize: "vertical" }} />
            ) : (
              <p style={{ fontSize: 14, color: "#c0c0d8", lineHeight: 1.7 }}>{hallazgo.descripcion}</p>
            )}
          </div>

          {/* Evidencia — texto + imágenes */}
          <div style={{ marginBottom: "1.5rem" }}>
            <p style={labelStyle}>Evidencia</p>

            {hallazgo.evidencia && (
              <p style={{ fontSize: 14, color: "#c0c0d8", lineHeight: 1.7, marginBottom: 12 }}>
                {hallazgo.evidencia}
              </p>
            )}

            {hallazgo.imagenesEvidencia?.length > 0 ? (
              <div>
                <p style={{ fontSize: 11, color: "#6b6b94", marginBottom: 8 }}>
                  {hallazgo.imagenesEvidencia.length} imagen{hallazgo.imagenesEvidencia.length > 1 ? "es" : ""} adjunta{hallazgo.imagenesEvidencia.length > 1 ? "s" : ""}
                </p>
                <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
                  {hallazgo.imagenesEvidencia.map((url, i) => (
                    <div key={i} style={{ position: "relative", cursor: "zoom-in" }}
                      onClick={() => setImagenAbierta(url)}>
                      <img
                        src={url}
                        alt={`Evidencia ${i + 1}`}
                        style={{
                          width: 110, height: 110, objectFit: "cover",
                          borderRadius: 8, border: "1px solid rgba(255,255,255,0.1)",
                          transition: "opacity 0.2s",
                        }}
                        onMouseEnter={e => (e.currentTarget.style.opacity = "0.8")}
                        onMouseLeave={e => (e.currentTarget.style.opacity = "1")}
                      />
                      <div style={{
                        position: "absolute", bottom: 4, right: 4,
                        background: "rgba(0,0,0,0.5)", borderRadius: 4,
                        padding: "2px 5px", fontSize: 10, color: "#fff",
                      }}>🔍</div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              !hallazgo.evidencia && (
                <p style={{ fontSize: 13, color: "#44445e" }}>Sin evidencia registrada.</p>
              )
            )}
          </div>

          {/* Recomendación */}
          <div style={{ marginBottom: "1.5rem" }}>
            <p style={labelStyle}>Recomendación de remediación</p>
            {editando ? (
              <textarea value={recomendEdit} onChange={e => setRecomendEdit(e.target.value)}
                rows={3} style={{ ...inputStyle, resize: "vertical" }} />
            ) : (
              <p style={{ fontSize: 14, color: "#c0c0d8", lineHeight: 1.7 }}>{hallazgo.recomendacion}</p>
            )}
          </div>

          {/* Botones */}
          <div style={{ display: "flex", gap: "1rem", justifyContent: "flex-end" }}>
            {editando ? (
              <>
                <button onClick={() => {
                  setEditando(false);
                  setEstadoEdit(hallazgo.estado);
                  setDescripEdit(hallazgo.descripcion);
                  setRecomendEdit(hallazgo.recomendacion);
                }} style={{
                  background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)",
                  borderRadius: 10, padding: "9px 20px", color: "#e8e8f0",
                  fontSize: 14, cursor: "pointer", fontFamily: "inherit",
                }}>Cancelar</button>
                <button onClick={handleGuardar} disabled={guardando} style={{
                  background: "linear-gradient(135deg, #6366f1, #818cf8)", border: "none",
                  borderRadius: 10, padding: "9px 24px", color: "#fff",
                  fontSize: 14, fontWeight: 500, cursor: "pointer", fontFamily: "inherit",
                  opacity: guardando ? 0.6 : 1,
                }}>{guardando ? "Guardando..." : "Guardar cambios"}</button>
              </>
            ) : (
              puedeEditar && (
                <button onClick={() => setEditando(true)} style={{
                  background: "rgba(99,102,241,0.1)", border: "1px solid rgba(99,102,241,0.2)",
                  borderRadius: 10, padding: "9px 20px", color: "#a5b4fc",
                  fontSize: 14, cursor: "pointer", fontFamily: "inherit",
                }}>✏️ Editar</button>
              )
            )}
          </div>
        </div>

        {/* Historial */}
        <div style={{
          background: "rgba(15,15,22,0.85)", border: "1px solid rgba(255,255,255,0.07)",
          borderRadius: 14, overflow: "hidden",
        }}>
          <div style={{ padding: "1.25rem 1.5rem", borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
            <h2 style={{ fontSize: 15, fontWeight: 600 }}>Historial de cambios</h2>
          </div>
          {historial.length === 0 ? (
            <div style={{ padding: "2rem", textAlign: "center", color: "#44445e", fontSize: 14 }}>
              Sin cambios registrados aún.
            </div>
          ) : (
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
                  {["Campo", "Valor anterior", "Valor nuevo", "Modificado por"].map(h => (
                    <th key={h} style={{
                      padding: "10px 16px", textAlign: "left", fontSize: 11,
                      color: "#6b6b94", textTransform: "uppercase", letterSpacing: "0.07em", fontWeight: 500,
                    }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {historial.map((item, i) => (
                  <tr key={item.id} style={{
                    borderBottom: "1px solid rgba(255,255,255,0.04)",
                    background: i % 2 === 0 ? "transparent" : "rgba(255,255,255,0.01)",
                  }}>
                    <td style={{ padding: "10px 16px", fontSize: 13, color: "#a5b4fc" }}>{item.campo}</td>
                    <td style={{ padding: "10px 16px", fontSize: 13, color: "#f87171" }}>{item.valorAnterior}</td>
                    <td style={{ padding: "10px 16px", fontSize: 13, color: "#34d399" }}>{item.valorNuevo}</td>
                    <td style={{ padding: "10px 16px", fontSize: 13, color: "#9999bb" }}>{item.modificadoPor}</td>
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

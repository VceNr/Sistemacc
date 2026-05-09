"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import {
  getHallazgo, updateHallazgo, getHistorialHallazgo,
  registrarAuditoria, registrarHistorial, subirImagenesEvidencia,
  type Hallazgo, type HistorialItem, type Estado,
} from "@/lib/api";
import { logger } from "@/lib/logger";

const colorSeveridad: Record<string, string> = {
  "Crítica": "#ef4444", "Alta": "#f97316",
  "Media":   "#eab308", "Baja": "#22c55e",
};

// Flujo lineal — solo se puede avanzar, nunca retroceder
const FLUJO_ESTADOS: Estado[] = ["Nuevo", "En análisis", "En remediación", "Mitigado", "Cerrado"];

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
  const [imagenAbierta,     setImagenAbierta]     = useState<string | null>(null);
  const [cambiandoEstado,   setCambiandoEstado]   = useState(false);
  const [nuevoEstado,       setNuevoEstado]       = useState<Estado | "">("");
  const [guardandoEstado,   setGuardandoEstado]   = useState(false);

  // Solo texto nuevo a AGREGAR — el texto original nunca se toca
  const [appendDescrip,   setAppendDescrip]   = useState("");
  const [appendRecomend,  setAppendRecomend]  = useState("");
  const [appendEvidencia, setAppendEvidencia] = useState("");
  const [nuevasImagenes,  setNuevasImagenes]  = useState<File[]>([]);

  const puedeEditar       = rol === "admin" || rol === "super-admin" || hallazgo?.nombreCreador === nombre;
  const puedeCambiarEstado = rol === "admin" || rol === "super-admin";

  // Estados disponibles para avanzar (solo hacia adelante, nunca retroceder)
  const estadosSiguientes: Estado[] = hallazgo
    ? FLUJO_ESTADOS.slice(FLUJO_ESTADOS.indexOf(hallazgo.estado) + 1)
    : [];

  async function handleCambiarEstado() {
    if (!hallazgo || !nuevoEstado || !user) return;
    // Validación doble: el nuevo estado debe estar más adelante en el flujo
    const idxActual = FLUJO_ESTADOS.indexOf(hallazgo.estado);
    const idxNuevo  = FLUJO_ESTADOS.indexOf(nuevoEstado as Estado);
    if (idxNuevo <= idxActual) return;

    setGuardandoEstado(true);
    try {
      await updateHallazgo(id, { estado: nuevoEstado as Estado });
      await registrarHistorial(id, "estado", hallazgo.estado, nuevoEstado, nombre ?? user.uid);
      await registrarAuditoria(
        nombre ?? user.uid,
        "CAMBIO_ESTADO",
        `Estado cambiado: ${hallazgo.estado} → ${nuevoEstado} — ID: ${id}`,
      );
      setHallazgo(prev => prev ? { ...prev, estado: nuevoEstado as Estado } : prev);
      const items = await getHistorialHallazgo(id);
      setHistorial(items);
      setCambiandoEstado(false);
      setNuevoEstado("");
      setMensaje(`Estado actualizado a "${nuevoEstado}".`);
    } catch (e) {
      logger.error(e);
      setMensaje("Error al cambiar el estado.");
    } finally {
      setGuardandoEstado(false);
    }
  }

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
        const items = await getHistorialHallazgo(id);
        setHistorial(items);
      } catch (e) {
        logger.error(e);
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

      if (appendDescrip.trim()) {
        const nuevo = hallazgo.descripcion + "\n\n" + appendDescrip.trim();
        cambios.descripcion = nuevo;
        promesas.push(registrarHistorial(id, "descripcion", hallazgo.descripcion, nuevo, nombre ?? user.uid));
      }
      if (appendRecomend.trim()) {
        const nuevo = hallazgo.recomendacion + "\n\n" + appendRecomend.trim();
        cambios.recomendacion = nuevo;
        promesas.push(registrarHistorial(id, "recomendacion", hallazgo.recomendacion, nuevo, nombre ?? user.uid));
      }
      if (appendEvidencia.trim() || nuevasImagenes.length > 0) {
        const urlsNuevas = nuevasImagenes.length > 0
          ? await subirImagenesEvidencia(id, nuevasImagenes)
          : [];
        if (appendEvidencia.trim()) {
          cambios.evidencia = (hallazgo.evidencia ?? "") + (hallazgo.evidencia ? "\n\n" : "") + appendEvidencia.trim();
        }
        if (urlsNuevas.length > 0) {
          cambios.imagenesEvidencia = [...(hallazgo.imagenesEvidencia ?? []), ...urlsNuevas];
        }
        promesas.push(registrarHistorial(id, "evidencia", "", "Evidencia actualizada", nombre ?? user.uid));
      }

      if (Object.keys(cambios).length > 0) {
        await updateHallazgo(id, cambios);
        await Promise.all(promesas);
        await registrarAuditoria(nombre ?? user.uid, "EDITAR_HALLAZGO", `Hallazgo editado — ID: ${id}`);

        const items = await getHistorialHallazgo(id);
        setHistorial(items);
        setHallazgo(prev => prev ? { ...prev, ...cambios } : prev);
        setMensaje("Comentarios agregados correctamente.");
        setAppendDescrip("");
        setAppendRecomend("");
        setAppendEvidencia("");
        setNuevasImagenes([]);
        setEditando(false);
      } else {
        setMensaje("No hay comentarios nuevos que guardar.");
      }
    } catch (e) {
      logger.error(e);
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

  const readonlyBlockStyle: React.CSSProperties = {
    fontSize: 14, color: "#c0c0d8", lineHeight: 1.7,
    background: "rgba(255,255,255,0.02)",
    border: "1px solid rgba(255,255,255,0.06)",
    borderRadius: 8, padding: "9px 12px",
    whiteSpace: "pre-wrap",
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

      <main style={{ padding: "2rem", maxWidth: 1400, margin: "0 auto" }}>

        {mensaje && (
          <div style={{
            background: mensaje.includes("Error") ? "rgba(239,68,68,0.08)" : "rgba(16,185,129,0.08)",
            border: `1px solid ${mensaje.includes("Error") ? "rgba(239,68,68,0.2)" : "rgba(16,185,129,0.2)"}`,
            borderRadius: 10, padding: "12px 16px",
            color: mensaje.includes("Error") ? "#f87171" : "#34d399",
            fontSize: 14, marginBottom: "1.5rem",
          }}>{mensaje}</div>
        )}

        <div style={{ display: "grid", gridTemplateColumns: "3fr 2fr", gap: "1.5rem", alignItems: "start" }}>

        <div style={{
          background: "rgba(15,15,22,0.85)", border: "1px solid rgba(255,255,255,0.07)",
          borderRadius: 14, padding: "2rem",
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
            <div style={{ display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap" }}>
              <span style={{
                background: `${colorEstado[hallazgo.estado]}22`,
                border: `1px solid ${colorEstado[hallazgo.estado]}44`,
                color: colorEstado[hallazgo.estado],
                borderRadius: 100, padding: "4px 14px", fontSize: 13,
              }}>{hallazgo.estado}</span>

              {/* Botón modificar — solo si puede cambiar y hay estados siguientes */}
              {puedeCambiarEstado && hallazgo.estado !== "Cerrado" && !cambiandoEstado && (
                <button onClick={() => { setCambiandoEstado(true); setNuevoEstado(""); }} style={{
                  background: "rgba(99,102,241,0.08)", border: "1px solid rgba(99,102,241,0.2)",
                  borderRadius: 8, padding: "4px 12px", color: "#a5b4fc",
                  fontSize: 12, cursor: "pointer", fontFamily: "inherit",
                }}>Modificar estado</button>
              )}

              {/* Combobox + confirmar */}
              {cambiandoEstado && (
                <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
                  <select
                    value={nuevoEstado}
                    onChange={e => setNuevoEstado(e.target.value as Estado)}
                    style={{
                      background: "rgba(255,255,255,0.05)", border: "1px solid rgba(99,102,241,0.3)",
                      borderRadius: 8, padding: "5px 10px", color: "#e8e8f0",
                      fontSize: 13, fontFamily: "inherit", outline: "none", cursor: "pointer",
                    }}
                  >
                    <option value="" disabled>Seleccionar estado...</option>
                    {estadosSiguientes.map(e => (
                      <option key={e} value={e}>{e}</option>
                    ))}
                  </select>
                  <button
                    onClick={handleCambiarEstado}
                    disabled={!nuevoEstado || guardandoEstado}
                    style={{
                      background: "linear-gradient(135deg, #6366f1, #818cf8)", border: "none",
                      borderRadius: 8, padding: "5px 14px", color: "#fff",
                      fontSize: 13, fontWeight: 500, cursor: !nuevoEstado || guardandoEstado ? "not-allowed" : "pointer",
                      fontFamily: "inherit", opacity: !nuevoEstado || guardandoEstado ? 0.5 : 1,
                    }}
                  >{guardandoEstado ? "Guardando..." : "Confirmar"}</button>
                  <button
                    onClick={() => { setCambiandoEstado(false); setNuevoEstado(""); }}
                    style={{
                      background: "none", border: "1px solid rgba(255,255,255,0.1)",
                      borderRadius: 8, padding: "5px 12px", color: "#6b6b94",
                      fontSize: 13, cursor: "pointer", fontFamily: "inherit",
                    }}
                  >Cancelar</button>
                </div>
              )}
            </div>

            {/* Indicador de progreso lineal */}
            <div style={{ display: "flex", alignItems: "center", gap: "4px", marginTop: "12px" }}>
              {FLUJO_ESTADOS.map((e, i) => {
                const idxActual = FLUJO_ESTADOS.indexOf(hallazgo.estado);
                const esPasado  = i < idxActual;
                const esActual  = i === idxActual;
                const esFuturo  = i > idxActual;
                return (
                  <div key={e} style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                    <div style={{
                      display: "flex", flexDirection: "column", alignItems: "center", gap: "4px",
                    }}>
                      <div style={{
                        width: 10, height: 10, borderRadius: "50%",
                        background: esActual ? colorEstado[e] : esPasado ? colorEstado[e] : "rgba(255,255,255,0.08)",
                        border: `2px solid ${esActual ? colorEstado[e] : esPasado ? colorEstado[e] + "88" : "rgba(255,255,255,0.1)"}`,
                        opacity: esFuturo ? 0.35 : 1,
                        flexShrink: 0,
                      }} />
                      <span style={{
                        fontSize: 9, color: esActual ? colorEstado[e] : esPasado ? "#6b6b94" : "#3a3a5c",
                        whiteSpace: "nowrap", fontWeight: esActual ? 700 : 400,
                      }}>{e}</span>
                    </div>
                    {i < FLUJO_ESTADOS.length - 1 && (
                      <div style={{
                        width: 20, height: 1, marginBottom: 14,
                        background: esPasado ? "rgba(255,255,255,0.2)" : "rgba(255,255,255,0.06)",
                        flexShrink: 0,
                      }} />
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Descripción técnica */}
          <div style={{ marginBottom: "1.5rem" }}>
            <p style={labelStyle}>Descripción técnica</p>
            <div style={readonlyBlockStyle}>{hallazgo.descripcion}</div>
            {editando && (
              <div style={{ marginTop: 10 }}>
                <p style={{ ...labelStyle, color: "#6366f1", marginBottom: 6 }}>Agregar comentario</p>
                <textarea
                  value={appendDescrip}
                  onChange={e => setAppendDescrip(e.target.value)}
                  placeholder="Escribe aquí para agregar texto adicional..."
                  rows={3}
                  style={{ ...inputStyle, resize: "vertical" }}
                />
              </div>
            )}
          </div>

          {/* Evidencia */}
          <div style={{ marginBottom: "1.5rem" }}>
            <p style={labelStyle}>Evidencia</p>

            {/* Texto existente — solo lectura */}
            {hallazgo.evidencia && (
              <div style={{ ...readonlyBlockStyle, marginBottom: 12 }}>{hallazgo.evidencia}</div>
            )}

            {/* Imágenes existentes — solo lectura */}
            {hallazgo.imagenesEvidencia?.length > 0 && (
              <div style={{ marginBottom: 12 }}>
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
            )}

            {!hallazgo.evidencia && !hallazgo.imagenesEvidencia?.length && (
              <p style={{ fontSize: 13, color: "#44445e", marginBottom: 12 }}>Sin evidencia registrada.</p>
            )}

            {/* Inputs para agregar — solo en modo edición */}
            {editando && (
              <div style={{ marginTop: 10, display: "flex", flexDirection: "column", gap: 12 }}>
                <div>
                  <p style={{ ...labelStyle, color: "#6366f1", marginBottom: 6 }}>Agregar comentario de evidencia</p>
                  <textarea
                    value={appendEvidencia}
                    onChange={e => setAppendEvidencia(e.target.value)}
                    placeholder="Escribe aquí para agregar texto adicional..."
                    rows={3}
                    style={{ ...inputStyle, resize: "vertical" }}
                  />
                </div>
                <div>
                  <p style={{ ...labelStyle, color: "#6366f1", marginBottom: 6 }}>Agregar imágenes</p>
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={e => setNuevasImagenes(Array.from(e.target.files ?? []))}
                    style={{ fontSize: 13, color: "#c0c0d8" }}
                  />
                  {nuevasImagenes.length > 0 && (
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 8 }}>
                      {nuevasImagenes.map((f, i) => (
                        <span key={i} style={{
                          background: "rgba(99,102,241,0.1)", border: "1px solid rgba(99,102,241,0.2)",
                          borderRadius: 6, padding: "3px 10px", fontSize: 12, color: "#a5b4fc",
                        }}>{f.name}</span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Recomendación */}
          <div style={{ marginBottom: "1.5rem" }}>
            <p style={labelStyle}>Recomendación de remediación</p>
            <div style={readonlyBlockStyle}>{hallazgo.recomendacion}</div>
            {editando && (
              <div style={{ marginTop: 10 }}>
                <p style={{ ...labelStyle, color: "#6366f1", marginBottom: 6 }}>Agregar comentario</p>
                <textarea
                  value={appendRecomend}
                  onChange={e => setAppendRecomend(e.target.value)}
                  placeholder="Escribe aquí para agregar texto adicional..."
                  rows={3}
                  style={{ ...inputStyle, resize: "vertical" }}
                />
              </div>
            )}
          </div>

          {/* Botones */}
          <div style={{ display: "flex", gap: "1rem", justifyContent: "flex-end" }}>
            {editando ? (
              <>
                <button onClick={() => {
                  setEditando(false);
                  setAppendDescrip("");
                  setAppendRecomend("");
                  setAppendEvidencia("");
                  setNuevasImagenes([]);
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
                }}>{guardando ? "Guardando..." : "Guardar comentarios"}</button>
              </>
            ) : (
              puedeEditar && (
                <button onClick={() => setEditando(true)} style={{
                  background: "rgba(99,102,241,0.1)", border: "1px solid rgba(99,102,241,0.2)",
                  borderRadius: 10, padding: "9px 20px", color: "#a5b4fc",
                  fontSize: 14, cursor: "pointer", fontFamily: "inherit",
                }}>+ Agregar comentarios</button>
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
            <div style={{ display: "flex", flexDirection: "column" }}>
              {historial.map((item, i) => (
                <div key={item.id} style={{
                  padding: "12px 16px",
                  borderBottom: i < historial.length - 1 ? "1px solid rgba(255,255,255,0.04)" : "none",
                  background: i % 2 === 0 ? "transparent" : "rgba(255,255,255,0.01)",
                }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                    <span style={{ fontSize: 11, fontWeight: 600, color: "#a5b4fc", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                      {item.campo}
                    </span>
                    <span style={{ fontSize: 11, color: "#44445e" }}>{item.modificadoPor}</span>
                  </div>
                  <div style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
                    <span style={{ fontSize: 12, color: "#f87171", flex: 1, wordBreak: "break-word" }}>{item.valorAnterior}</span>
                    <span style={{ color: "#44445e", fontSize: 12, flexShrink: 0 }}>→</span>
                    <span style={{ fontSize: 12, color: "#34d399", flex: 1, wordBreak: "break-word" }}>{item.valorNuevo}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        </div>{/* fin grid */}
      </main>
    </div>
  );
}

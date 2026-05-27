"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import {
  createHallazgo, updateHallazgo, subirImagenesEvidencia, registrarAuditoria,
  type Severidad,
} from "@/lib/api";
import { logger } from "@/lib/logger";
import DOMPurify from "dompurify";

interface HallazgoFormProps {
  redirectUrl: string;
}

export default function HallazgoForm({ redirectUrl }: HallazgoFormProps) {
  const { user, nombre, rol } = useAuth();
  const router = useRouter();

  const [loading,   setLoading]   = useState(false);
  const [error,     setError]     = useState<string | null>(null);
  const [imagenes,  setImagenes]  = useState<File[]>([]);
  const [previews,  setPreviews]  = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState({
    activo:        "",
    tipo:          "",
    severidad:     "" as Severidad | "",
    descripcion:   "",
    evidencia:     "",
    recomendacion: "",
    fecha:         new Date().toISOString().split("T")[0],
  });

  const [errores, setErrores] = useState<Record<string, string>>({});

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
    if (errores[name]) setErrores(prev => ({ ...prev, [name]: "" }));
  }

  // ── Manejo de imágenes ─────────────────────────────────────
  function handleImagenes(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    if (files.length === 0) return;

    const validas = files.filter(f => f.type.startsWith("image/") && f.size <= 5 * 1024 * 1024);

    if (validas.length !== files.length) {
      setError("Solo se permiten imágenes de hasta 5MB cada una.");
      return;
    }

    const nuevas = [...imagenes, ...validas].slice(0, 5);

    // Limpiar previews anteriores antes de crear nuevos
    previews.forEach(url => URL.revokeObjectURL(url));

    setImagenes(nuevas);
    setPreviews(nuevas.map(f => URL.createObjectURL(f)));
    setError(null);
  }

  function removeImagen(index: number) {
    URL.revokeObjectURL(previews[index]);
    const nuevas = imagenes.filter((_, i) => i !== index);
    setImagenes(nuevas);
    setPreviews(nuevas.map(f => URL.createObjectURL(f)));
  }

  // ── Validación ─────────────────────────────────────────────
  function validar(): boolean {
    const nuevosErrores: Record<string, string> = {};
    if (!form.fecha)         nuevosErrores.fecha         = "La fecha es obligatoria.";
    if (!form.activo.trim()) nuevosErrores.activo         = "El activo afectado es obligatorio.";
    if (!form.tipo.trim())   nuevosErrores.tipo           = "El tipo de vulnerabilidad es obligatorio.";
    if (!form.severidad)     nuevosErrores.severidad      = "Selecciona una severidad.";
    if (!form.descripcion.trim() || form.descripcion.trim().length < 20)
      nuevosErrores.descripcion = "La descripción debe tener al menos 20 caracteres.";
    if (!form.evidencia.trim() && imagenes.length === 0)
      nuevosErrores.evidencia = "Agrega una descripción de evidencia o sube al menos una imagen.";
    if (!form.recomendacion.trim() || form.recomendacion.trim().length < 10)
      nuevosErrores.recomendacion = "La recomendación debe tener al menos 10 caracteres.";
    setErrores(nuevosErrores);
    return Object.keys(nuevosErrores).length === 0;
  }

  // ── Submit ─────────────────────────────────────────────────
  async function handleSubmit(e: React.SyntheticEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    if (!validar()) return;
    if (!user) { setError("No hay sesión activa."); return; }

    setLoading(true);
    try {
      // Elimina TODO el HTML — sin tags permitidos, sin atributos
      const sanitize = (str: string) =>
        DOMPurify.sanitize(str, { ALLOWED_TAGS: [], ALLOWED_ATTR: [] });

      // 1. Crear el documento y obtener su ID
      const findingId = await createHallazgo({
        fecha:         form.fecha,
        activo:        sanitize(form.activo),
        tipo:          sanitize(form.tipo),
        severidad:     form.severidad as Severidad,
        descripcion:   sanitize(form.descripcion),
        evidencia:     sanitize(form.evidencia),
        recomendacion: sanitize(form.recomendacion),
        creadoPor:     user.uid,
        nombreCreador: nombre ?? "Desconocido",
        rolCreador:    rol ?? "analista",
      });

      // 2. Subir imágenes usando el ID como carpeta
      setUploading(true);
      const imageUrls = await subirImagenesEvidencia(findingId, imagenes);
      setUploading(false);

      // 3. Actualizar el documento con las URLs de las imágenes
      if (imageUrls.length > 0) {
        await updateHallazgo(findingId, { imagenesEvidencia: imageUrls });
      }

      await registrarAuditoria(
        nombre ?? user.uid,
        "CREAR_HALLAZGO",
        `Hallazgo creado — ID: ${findingId} — Activo: ${form.activo} — Severidad: ${form.severidad} — Imágenes: ${imageUrls.length}`,
      );

      // Limpiar object URLs antes de salir
      previews.forEach(url => URL.revokeObjectURL(url));

      router.push(redirectUrl);
    } catch (err) {
      logger.error(err);
      setError("Error al guardar el hallazgo. Intenta de nuevo.");
      setUploading(false);
    } finally {
      setLoading(false);
    }
  }

  const inputStyle = (campo: string): React.CSSProperties => ({
    width: "100%",
    background: "rgba(255,255,255,0.035)",
    border: `1px solid ${errores[campo] ? "#ef4444" : "rgba(255,255,255,0.08)"}`,
    borderRadius: 10, padding: "10px 14px", fontSize: 14,
    color: "#e8e8f0", fontFamily: "inherit", outline: "none",
    boxSizing: "border-box" as const, transition: "border-color 0.2s",
  });

  const labelStyle: React.CSSProperties = {
    display: "block", fontSize: 12, fontWeight: 500,
    letterSpacing: "0.07em", textTransform: "uppercase",
    color: "#6b6b94", marginBottom: 6,
  };

  const errorStyle: React.CSSProperties = { fontSize: 12, color: "#f87171", marginTop: 4 };
  const fieldStyle: React.CSSProperties = { marginBottom: "1.2rem" };

  return (
    <div style={{ minHeight: "100vh", background: "#0a0a0f", color: "#f0f0f5", fontFamily: "DM Sans, sans-serif" }}>
      <style>{`
        .hf-navbar { padding: 0 2rem; }
        .hf-grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; }
        @media (max-width: 600px) {
          .hf-navbar { padding: 0 1rem; }
          .hf-grid-2 { grid-template-columns: 1fr; }
        }
      `}</style>

      <nav style={{
        borderBottom: "1px solid rgba(255,255,255,0.07)",
        display: "flex", alignItems: "center", justifyContent: "space-between",
        height: "60px", background: "rgba(15,15,22,0.9)", backdropFilter: "blur(12px)",
        position: "sticky", top: 0, zIndex: 50,
      }} className="hf-navbar">
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <button onClick={() => router.back()} style={{
            background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)",
            borderRadius: 8, padding: "6px 14px", color: "#e8e8f0",
            fontSize: 13, cursor: "pointer", fontFamily: "inherit",
          }}>← Volver</button>
          <span style={{ fontWeight: 600, fontSize: 15 }}>Nuevo Hallazgo</span>
        </div>
        <span style={{ fontSize: 13, color: "#64648a" }}>
          {nombre} — <span style={{ color: "#a5b4fc" }}>{rol}</span>
        </span>
      </nav>

      <main style={{ padding: "2.5rem 2rem", maxWidth: 800, margin: "0 auto" }}>
        <div style={{ marginBottom: "2rem" }}>
          <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 6 }}>Registrar hallazgo</h1>
          <p style={{ color: "#64648a", fontSize: 14 }}>Todos los campos son obligatorios.</p>
        </div>

        {error && (
          <div style={{
            background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)",
            borderRadius: 10, padding: "12px 16px", color: "#f87171",
            fontSize: 14, marginBottom: "1.5rem",
          }}>{error}</div>
        )}

        <form onSubmit={handleSubmit} noValidate>
          <div style={{
            background: "rgba(15,15,22,0.85)", border: "1px solid rgba(255,255,255,0.07)",
            borderRadius: 14, padding: "2rem",
          }}>

            {/* Fecha + Activo */}
            <div className="hf-grid-2">
              <div style={fieldStyle}>
                <label style={labelStyle}>Fecha del hallazgo</label>
                <input type="date" name="fecha" value={form.fecha} onChange={handleChange} style={inputStyle("fecha")} />
                {errores.fecha && <p style={errorStyle}>{errores.fecha}</p>}
              </div>
              <div style={fieldStyle}>
                <label style={labelStyle}>Activo afectado</label>
                <input type="text" name="activo" value={form.activo} onChange={handleChange}
                  placeholder="ej: Infopunto-03" style={inputStyle("activo")} />
                {errores.activo && <p style={errorStyle}>{errores.activo}</p>}
              </div>
            </div>

            {/* Tipo + Severidad */}
            <div className="hf-grid-2">
              <div style={fieldStyle}>
                <label style={labelStyle}>Tipo de vulnerabilidad</label>
                <input type="text" name="tipo" value={form.tipo} onChange={handleChange}
                  placeholder="ej: Contraseña débil, Puerto abierto" style={inputStyle("tipo")} />
                {errores.tipo && <p style={errorStyle}>{errores.tipo}</p>}
              </div>
              <div style={fieldStyle}>
                <label style={labelStyle}>Severidad</label>
                <select name="severidad" value={form.severidad} onChange={handleChange} style={inputStyle("severidad")}>
                  <option value="">Seleccionar...</option>
                  <option value="Crítica">🔴 Crítica</option>
                  <option value="Alta">🟠 Alta</option>
                  <option value="Media">🟡 Media</option>
                  <option value="Baja">🟢 Baja</option>
                </select>
                {errores.severidad && <p style={errorStyle}>{errores.severidad}</p>}
              </div>
            </div>

            {/* Descripción */}
            <div style={fieldStyle}>
              <label style={labelStyle}>Descripción técnica</label>
              <textarea name="descripcion" value={form.descripcion} onChange={handleChange} rows={4}
                placeholder="Describe técnicamente la vulnerabilidad encontrada..."
                style={{ ...inputStyle("descripcion"), resize: "vertical" }} />
              {errores.descripcion && <p style={errorStyle}>{errores.descripcion}</p>}
            </div>

            {/* Evidencia — texto + imágenes */}
            <div style={fieldStyle}>
              <label style={labelStyle}>Evidencia</label>
              <textarea name="evidencia" value={form.evidencia} onChange={handleChange} rows={2}
                placeholder="Descripción de la evidencia (opcional si subes imágenes)..."
                style={{ ...inputStyle("evidencia"), resize: "vertical", marginBottom: 10 }} />

              {/* Upload de imágenes */}
              <div
                onClick={() => fileInputRef.current?.click()}
                style={{
                  border: `2px dashed ${errores.evidencia ? "#ef4444" : "rgba(99,102,241,0.3)"}`,
                  borderRadius: 10, padding: "1.25rem",
                  textAlign: "center", cursor: "pointer",
                  background: "rgba(99,102,241,0.04)",
                  transition: "border-color 0.2s",
                }}
              >
                <p style={{ fontSize: 13, color: "#6b6b94", marginBottom: 4 }}>
                  📎 Haz clic para subir imágenes de evidencia
                </p>
                <p style={{ fontSize: 11, color: "#44445e" }}>
                  PNG, JPG, WEBP — máx. 5MB por imagen — hasta 5 imágenes
                </p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleImagenes}
                  style={{ display: "none" }}
                />
              </div>

              {errores.evidencia && <p style={errorStyle}>{errores.evidencia}</p>}

              {/* Previews */}
              {previews.length > 0 && (
                <div style={{ display: "flex", gap: "10px", marginTop: "12px", flexWrap: "wrap" }}>
                  {previews.map((url, i) => (
                    <div key={i} style={{ position: "relative" }}>
                      <img
                        src={url}
                        alt={`Evidencia ${i + 1}`}
                        style={{
                          width: 90, height: 90, objectFit: "cover",
                          borderRadius: 8, border: "1px solid rgba(255,255,255,0.1)",
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => removeImagen(i)}
                        style={{
                          position: "absolute", top: -6, right: -6,
                          width: 20, height: 20, borderRadius: "50%",
                          background: "#ef4444", border: "none",
                          color: "#fff", fontSize: 11, cursor: "pointer",
                          display: "flex", alignItems: "center", justifyContent: "center",
                          lineHeight: 1,
                        }}
                      >✕</button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Recomendación */}
            <div style={fieldStyle}>
              <label style={labelStyle}>Recomendación de remediación</label>
              <textarea name="recomendacion" value={form.recomendacion} onChange={handleChange} rows={3}
                placeholder="¿Qué se debe hacer para corregir esta vulnerabilidad?"
                style={{ ...inputStyle("recomendacion"), resize: "vertical" }} />
              {errores.recomendacion && <p style={errorStyle}>{errores.recomendacion}</p>}
            </div>

            {/* Info */}
            <div style={{
              background: "rgba(99,102,241,0.06)", border: "1px solid rgba(99,102,241,0.15)",
              borderRadius: 10, padding: "12px 16px", fontSize: 13, color: "#6b6b94",
              marginBottom: "1.5rem",
            }}>
              Estado inicial: <strong style={{ color: "#a5b4fc" }}>Nuevo</strong>
              &nbsp;·&nbsp; Creado por: <strong style={{ color: "#a5b4fc" }}>{nombre}</strong>
              &nbsp;·&nbsp; Rol: <strong style={{ color: "#a5b4fc" }}>{rol}</strong>
              {imagenes.length > 0 && (
                <>&nbsp;·&nbsp; <strong style={{ color: "#a5b4fc" }}>{imagenes.length} imagen{imagenes.length > 1 ? "es" : ""} lista{imagenes.length > 1 ? "s" : ""}</strong></>
              )}
            </div>

            {/* Botones */}
            <div style={{ display: "flex", gap: "1rem", justifyContent: "flex-end" }}>
              <button type="button" onClick={() => router.back()} style={{
                background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)",
                borderRadius: 10, padding: "10px 24px", color: "#e8e8f0",
                fontSize: 14, cursor: "pointer", fontFamily: "inherit",
              }}>Cancelar</button>
              <button type="submit" disabled={loading || uploading} style={{
                background: loading || uploading ? "rgba(99,102,241,0.4)" : "linear-gradient(135deg, #6366f1, #818cf8)",
                border: "none", borderRadius: 10, padding: "10px 28px",
                color: "#fff", fontSize: 14, fontWeight: 500,
                cursor: loading || uploading ? "not-allowed" : "pointer",
                fontFamily: "inherit",
                boxShadow: loading || uploading ? "none" : "0 4px 20px rgba(99,102,241,0.3)",
              }}>
                {uploading ? "Subiendo imágenes..." : loading ? "Guardando..." : "Guardar hallazgo"}
              </button>
            </div>

          </div>
        </form>
      </main>
    </div>
  );
}

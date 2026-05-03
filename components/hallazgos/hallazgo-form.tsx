"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/lib/auth-context";

// ── Tipos ────────────────────────────────────────────────────
type Severidad = "Crítica" | "Alta" | "Media" | "Baja";
type Estado    = "Nuevo" | "En análisis" | "En remediación" | "Mitigado" | "Cerrado";

interface HallazgoFormProps {
  redirectUrl: string; // a dónde redirige al guardar (admin o analista)
}

// ── Helpers de auditoría ─────────────────────────────────────
async function registrarAuditoria(usuario: string, accion: string, detalle: string) {
  try {
    await addDoc(collection(db, "audit_logs"), {
      usuario,
      accion,
      detalle,
      timestamp: serverTimestamp(),
    });
  } catch (e) {
    console.error("Error registrando auditoría:", e);
  }
}

// ── Componente ───────────────────────────────────────────────
export default function HallazgoForm({ redirectUrl }: HallazgoFormProps) {
  const { user, nombre, rol } = useAuth();
  const router = useRouter();

  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState<string | null>(null);

  // Estado del formulario
  const [form, setForm] = useState({
    activo:      "",
    tipo:        "",
    severidad:   "" as Severidad | "",
    descripcion: "",
    evidencia:   "",
    recomendacion: "",
    fecha:       new Date().toISOString().split("T")[0],
  });

  // Errores por campo
  const [errores, setErrores] = useState<Record<string, string>>({});

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
    // Limpia el error del campo al escribir
    if (errores[name]) setErrores(prev => ({ ...prev, [name]: "" }));
  }

  // ── Validación ───────────────────────────────────────────
  function validar(): boolean {
    const nuevosErrores: Record<string, string> = {};

    if (!form.fecha)         nuevosErrores.fecha         = "La fecha es obligatoria.";
    if (!form.activo.trim()) nuevosErrores.activo         = "El activo afectado es obligatorio.";
    if (!form.tipo.trim())   nuevosErrores.tipo           = "El tipo de vulnerabilidad es obligatorio.";
    if (!form.severidad)     nuevosErrores.severidad      = "Selecciona una severidad.";
    if (!form.descripcion.trim() || form.descripcion.trim().length < 20)
      nuevosErrores.descripcion = "La descripción debe tener al menos 20 caracteres.";
    if (!form.evidencia.trim())
      nuevosErrores.evidencia = "La evidencia es obligatoria.";
    if (!form.recomendacion.trim() || form.recomendacion.trim().length < 10)
      nuevosErrores.recomendacion = "La recomendación debe tener al menos 10 caracteres.";

    setErrores(nuevosErrores);
    return Object.keys(nuevosErrores).length === 0;
  }

  // ── Submit ───────────────────────────────────────────────
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!validar()) return;
    if (!user) {
      setError("No hay sesión activa.");
      return;
    }

    setLoading(true);
    try {
      // Sanitizar entradas (prevenir XSS)
      const sanitize = (str: string) =>
        str.replace(/</g, "&lt;").replace(/>/g, "&gt;").trim();

      const nuevoHallazgo = {
        fecha:         form.fecha,
        activo:        sanitize(form.activo),
        tipo:          sanitize(form.tipo),
        severidad:     form.severidad as Severidad,
        descripcion:   sanitize(form.descripcion),
        evidencia:     sanitize(form.evidencia),
        recomendacion: sanitize(form.recomendacion),
        estado:        "Nuevo" as Estado,
        creadoPor:     user.uid,
        nombreCreador: nombre ?? "Desconocido",
        rolCreador:    rol ?? "analista",
        creadoEn:      serverTimestamp(),
        actualizadoEn: serverTimestamp(),
      };

      // Guardar en Firestore
      const docRef = await addDoc(collection(db, "findings"), nuevoHallazgo);

      // Registrar en auditoría
      await registrarAuditoria(
        nombre ?? user.uid,
        "CREAR_HALLAZGO",
        `Hallazgo creado con ID: ${docRef.id} — Activo: ${form.activo} — Severidad: ${form.severidad}`
      );

      // Redirigir a la lista
      router.push(redirectUrl);

    } catch (err) {
      console.error(err);
      setError("Error al guardar el hallazgo. Intenta de nuevo.");
    } finally {
      setLoading(false);
    }
  }

  // ── Estilos ──────────────────────────────────────────────
  const inputStyle = (campo: string): React.CSSProperties => ({
    width: "100%",
    background: "rgba(255,255,255,0.035)",
    border: `1px solid ${errores[campo] ? "#ef4444" : "rgba(255,255,255,0.08)"}`,
    borderRadius: 10,
    padding: "10px 14px",
    fontSize: 14,
    color: "#e8e8f0",
    fontFamily: "inherit",
    outline: "none",
    boxSizing: "border-box" as const,
    transition: "border-color 0.2s",
  });

  const labelStyle: React.CSSProperties = {
    display: "block",
    fontSize: 12,
    fontWeight: 500,
    letterSpacing: "0.07em",
    textTransform: "uppercase",
    color: "#6b6b94",
    marginBottom: 6,
  };

  const errorStyle: React.CSSProperties = {
    fontSize: 12,
    color: "#f87171",
    marginTop: 4,
  };

  const fieldStyle: React.CSSProperties = {
    marginBottom: "1.2rem",
  };

  return (
    <div style={{ minHeight: "100vh", background: "#0a0a0f", color: "#f0f0f5", fontFamily: "DM Sans, sans-serif" }}>

      {/* Navbar */}
      <nav style={{
        borderBottom: "1px solid rgba(255,255,255,0.07)",
        padding: "0 2rem",
        display: "flex", alignItems: "center", justifyContent: "space-between",
        height: "60px", background: "rgba(15,15,22,0.9)", backdropFilter: "blur(12px)",
        position: "sticky", top: 0, zIndex: 50,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <button onClick={() => router.back()} style={{
            background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)",
            borderRadius: 8, padding: "6px 14px", color: "#e8e8f0",
            fontSize: 13, cursor: "pointer", fontFamily: "inherit",
          }}>
            ← Volver
          </button>
          <span style={{ fontWeight: 600, fontSize: 15 }}>Nuevo Hallazgo</span>
        </div>
        <span style={{ fontSize: 13, color: "#64648a" }}>
          {nombre} — <span style={{ color: "#a5b4fc" }}>{rol}</span>
        </span>
      </nav>

      {/* Formulario */}
      <main style={{ padding: "2.5rem 2rem", maxWidth: 800, margin: "0 auto" }}>

        <div style={{ marginBottom: "2rem" }}>
          <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 6 }}>Registrar hallazgo</h1>
          <p style={{ color: "#64648a", fontSize: 14 }}>Todos los campos son obligatorios.</p>
        </div>

        {/* Error global */}
        {error && (
          <div style={{
            background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)",
            borderRadius: 10, padding: "12px 16px", color: "#f87171",
            fontSize: 14, marginBottom: "1.5rem",
          }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} noValidate>
          <div style={{
            background: "rgba(15,15,22,0.85)", border: "1px solid rgba(255,255,255,0.07)",
            borderRadius: 14, padding: "2rem",
          }}>

            {/* Fila: Fecha + Activo */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
              <div style={fieldStyle}>
                <label style={labelStyle}>Fecha del hallazgo</label>
                <input type="date" name="fecha" value={form.fecha}
                  onChange={handleChange} style={inputStyle("fecha")} />
                {errores.fecha && <p style={errorStyle}>{errores.fecha}</p>}
              </div>
              <div style={fieldStyle}>
                <label style={labelStyle}>Activo afectado</label>
                <input type="text" name="activo" value={form.activo}
                  onChange={handleChange} placeholder="ej: Infopunto-03"
                  style={inputStyle("activo")} />
                {errores.activo && <p style={errorStyle}>{errores.activo}</p>}
              </div>
            </div>

            {/* Fila: Tipo + Severidad */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
              <div style={fieldStyle}>
                <label style={labelStyle}>Tipo de vulnerabilidad</label>
                <input type="text" name="tipo" value={form.tipo}
                  onChange={handleChange} placeholder="ej: Contraseña débil, Puerto abierto"
                  style={inputStyle("tipo")} />
                {errores.tipo && <p style={errorStyle}>{errores.tipo}</p>}
              </div>
              <div style={fieldStyle}>
                <label style={labelStyle}>Severidad</label>
                <select name="severidad" value={form.severidad}
                  onChange={handleChange} style={inputStyle("severidad")}>
                  <option value="">Seleccionar...</option>
                  <option value="Crítica">🔴 Crítica</option>
                  <option value="Alta">🟠 Alta</option>
                  <option value="Media">🟡 Media</option>
                  <option value="Baja">🟢 Baja</option>
                </select>
                {errores.severidad && <p style={errorStyle}>{errores.severidad}</p>}
              </div>
            </div>

            {/* Descripción técnica */}
            <div style={fieldStyle}>
              <label style={labelStyle}>Descripción técnica</label>
              <textarea name="descripcion" value={form.descripcion}
                onChange={handleChange} rows={4}
                placeholder="Describe técnicamente la vulnerabilidad encontrada..."
                style={{ ...inputStyle("descripcion"), resize: "vertical" }} />
              {errores.descripcion && <p style={errorStyle}>{errores.descripcion}</p>}
            </div>

            {/* Evidencia */}
            <div style={fieldStyle}>
              <label style={labelStyle}>Evidencia</label>
              <textarea name="evidencia" value={form.evidencia}
                onChange={handleChange} rows={3}
                placeholder="URL de captura de pantalla o descripción de la evidencia..."
                style={{ ...inputStyle("evidencia"), resize: "vertical" }} />
              {errores.evidencia && <p style={errorStyle}>{errores.evidencia}</p>}
            </div>

            {/* Recomendación */}
            <div style={fieldStyle}>
              <label style={labelStyle}>Recomendación de remediación</label>
              <textarea name="recomendacion" value={form.recomendacion}
                onChange={handleChange} rows={3}
                placeholder="¿Qué se debe hacer para corregir esta vulnerabilidad?"
                style={{ ...inputStyle("recomendacion"), resize: "vertical" }} />
              {errores.recomendacion && <p style={errorStyle}>{errores.recomendacion}</p>}
            </div>

            {/* Info readonly */}
            <div style={{
              background: "rgba(99,102,241,0.06)", border: "1px solid rgba(99,102,241,0.15)",
              borderRadius: 10, padding: "12px 16px", fontSize: 13, color: "#6b6b94",
              marginBottom: "1.5rem",
            }}>
              Estado inicial: <strong style={{ color: "#a5b4fc" }}>Nuevo</strong>
              &nbsp;·&nbsp; Creado por: <strong style={{ color: "#a5b4fc" }}>{nombre}</strong>
              &nbsp;·&nbsp; Rol: <strong style={{ color: "#a5b4fc" }}>{rol}</strong>
            </div>

            {/* Botones */}
            <div style={{ display: "flex", gap: "1rem", justifyContent: "flex-end" }}>
              <button type="button" onClick={() => router.back()} style={{
                background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)",
                borderRadius: 10, padding: "10px 24px", color: "#e8e8f0",
                fontSize: 14, cursor: "pointer", fontFamily: "inherit",
              }}>
                Cancelar
              </button>
              <button type="submit" disabled={loading} style={{
                background: loading ? "rgba(99,102,241,0.4)" : "linear-gradient(135deg, #6366f1, #818cf8)",
                border: "none", borderRadius: 10, padding: "10px 28px",
                color: "#fff", fontSize: 14, fontWeight: 500,
                cursor: loading ? "not-allowed" : "pointer",
                fontFamily: "inherit",  
                boxShadow: loading ? "none" : "0 4px 20px rgba(99,102,241,0.3)",
              }}>
                {loading ? "Guardando..." : "Guardar hallazgo"}
              </button>
            </div>

          </div>
        </form>
      </main>
    </div>
  );
}   
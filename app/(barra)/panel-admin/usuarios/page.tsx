"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth, type Rol } from "@/lib/auth-context";
import { getAllUsers, toggleUserEstado, migrarUsersDocId, type UserRecord } from "@/lib/api";

const colorCargo: Record<string, string> = {
  "super-admin": "#f59e0b",
  admin:         "#a5b4fc",
  analista:      "#34d399",
};

// Reglas de quién puede inactivar a quién:
// super-admin → puede cambiar estado de admin y analista (no a otros super-admin)
// admin       → puede cambiar estado de analista solo
function puedeToggle(miRol: Rol | null, targetCargo: string): boolean {
  if (miRol === "super-admin") return targetCargo !== "super-admin";
  if (miRol === "admin")       return targetCargo === "analista";
  return false;
}

const ROLES_CON_ACCESO: Rol[] = ["admin", "super-admin"];

export default function UsuariosPage() {
  const { user, rol, nombre, loading: authLoading } = useAuth();
  const router = useRouter();

  const [usuarios, setUsuarios] = useState<UserRecord[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [toggling,   setToggling]   = useState<string | null>(null);
  const [error,      setError]      = useState<string | null>(null);
  const [migrando,   setMigrando]   = useState(false);
  const [migrResult, setMigrResult] = useState<{ migrados: number; omitidos: number } | null>(null);

  useEffect(() => {
    if (authLoading) return;
    if (!user) { router.push("/login"); return; }
    if (!ROLES_CON_ACCESO.includes(rol as Rol)) router.push("/panel-admin");
  }, [user, rol, authLoading, router]);

  useEffect(() => {
    if (!user || !ROLES_CON_ACCESO.includes(rol as Rol)) return;
    getAllUsers()
      .then(all => setUsuarios(all.filter(u => u.cargo !== "super-admin")))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [user, rol]);

  async function handleMigrar() {
    setMigrando(true);
    setMigrResult(null);
    setError(null);
    try {
      const result = await migrarUsersDocId();
      setMigrResult(result);
    } catch (e) {
      console.error(e);
      setError("Error durante la migración. Asegúrate de tener reglas de Firestore permisivas activas.");
    } finally {
      setMigrando(false);
    }
  }

  async function handleToggle(u: UserRecord) {
    if (!puedeToggle(rol, u.cargo)) return;
    const nuevo: "activo" | "inactivo" = u.estado === "activo" ? "inactivo" : "activo";
    setToggling(u.docId);
    setError(null);
    try {
      await toggleUserEstado(u.docId, nuevo);
      setUsuarios(prev =>
        prev.map(x => x.docId === u.docId ? { ...x, estado: nuevo } : x)
      );
    } catch (e) {
      console.error(e);
      setError("Error al cambiar el estado del usuario.");
    } finally {
      setToggling(null);
    }
  }

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
            background: rol === "super-admin" ? "rgba(245,158,11,0.15)" : "rgba(99,102,241,0.15)",
            border: `1px solid ${rol === "super-admin" ? "rgba(245,158,11,0.3)" : "rgba(99,102,241,0.3)"}`,
            borderRadius: 100, padding: "2px 10px", fontSize: 11,
            color: rol === "super-admin" ? "#fbbf24" : "#a5b4fc",
            textTransform: "uppercase",
          }}>{rol ?? "usuario"}</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
          <span style={{ fontSize: 13, color: "#64648a" }}>
            Hola, <strong style={{ color: "#e8e8f0" }}>{nombre}</strong>
          </span>
          <button onClick={() => router.push("/panel-admin")} style={{
            background: "rgba(99,102,241,0.1)", border: "1px solid rgba(99,102,241,0.2)",
            borderRadius: 8, padding: "6px 14px", color: "#a5b4fc",
            fontSize: 13, cursor: "pointer", fontFamily: "inherit",
          }}>← Volver</button>
        </div>
      </nav>

      <main style={{ padding: "2.5rem 2rem", maxWidth: 1000, margin: "0 auto" }}>

        <div style={{ marginBottom: "2rem" }}>
          <h1 style={{ fontSize: 28, fontWeight: 700, marginBottom: 6 }}>Usuarios</h1>
          <p style={{ color: "#64648a", fontSize: 14 }}>
            {usuarios.length} usuario{usuarios.length !== 1 ? "s" : ""} registrado{usuarios.length !== 1 ? "s" : ""}
          </p>
        </div>

        {error && (
          <div style={{
            background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)",
            borderRadius: 10, padding: "12px 16px", color: "#f87171",
            fontSize: 14, marginBottom: "1rem",
          }}>{error}</div>
        )}

        {/* Panel de migración — solo super-admin */}
        {rol === "super-admin" && (
          <div style={{
            background: "rgba(245,158,11,0.06)", border: "1px solid rgba(245,158,11,0.2)",
            borderRadius: 10, padding: "14px 18px", marginBottom: "1.5rem",
            display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12,
          }}>
            <div>
              <p style={{ fontSize: 13, fontWeight: 600, color: "#fbbf24", marginBottom: 3 }}>
                Migración de base de datos
              </p>
              <p style={{ fontSize: 12, color: "#78716c" }}>
                Convierte los documentos de usuario con ID aleatorio al UID de Firebase.
                Ejecutar solo una vez. Requiere reglas permisivas temporales en Firestore.
              </p>
              {migrResult && (
                <p style={{ fontSize: 12, color: "#34d399", marginTop: 6 }}>
                  ✓ Migración completa — {migrResult.migrados} migrados, {migrResult.omitidos} ya correctos
                </p>
              )}
            </div>
            <button
              onClick={handleMigrar}
              disabled={migrando}
              style={{
                background: "rgba(245,158,11,0.15)", border: "1px solid rgba(245,158,11,0.35)",
                borderRadius: 8, padding: "8px 18px", color: "#fbbf24",
                fontSize: 13, fontWeight: 500, cursor: migrando ? "not-allowed" : "pointer",
                fontFamily: "inherit", opacity: migrando ? 0.6 : 1, whiteSpace: "nowrap",
              }}
            >
              {migrando ? "Migrando..." : "Ejecutar migración"}
            </button>
          </div>
        )}

        {/* Leyenda de permisos */}
        <div style={{
          background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)",
          borderRadius: 10, padding: "10px 16px", marginBottom: "1.5rem",
          fontSize: 12, color: "#6b6b94", display: "flex", gap: 20, flexWrap: "wrap",
        }}>
          <span>🔒 Toggle bloqueado = sin permiso para cambiar ese rol</span>
          {rol === "admin"       && <span>Tu rol <strong style={{ color: "#a5b4fc" }}>Admin</strong> solo puede inactivar analistas</span>}
          {rol === "super-admin" && <span>Tu rol <strong style={{ color: "#fbbf24" }}>Super-Admin</strong> puede inactivar admins y analistas</span>}
        </div>

        <div style={{
          background: "rgba(15,15,22,0.85)", border: "1px solid rgba(255,255,255,0.07)",
          borderRadius: 12, overflow: "hidden",
        }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
                {["Nombre", "Correo", "Rol", "Estado", "Acción"].map(h => (
                  <th key={h} style={{
                    padding: "12px 16px", textAlign: "left", fontSize: 11,
                    color: "#6b6b94", textTransform: "uppercase",
                    letterSpacing: "0.07em", fontWeight: 500,
                  }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {usuarios.map((u, i) => {
                const activo     = u.estado === "activo";
                const cargando   = toggling === u.docId;
                const permitido  = puedeToggle(rol, u.cargo);

                return (
                  <tr key={u.docId} style={{
                    borderBottom: "1px solid rgba(255,255,255,0.04)",
                    background: i % 2 === 0 ? "transparent" : "rgba(255,255,255,0.01)",
                  }}>
                    <td style={{ padding: "14px 16px", fontSize: 14, fontWeight: 500 }}>{u.nombre}</td>
                    <td style={{ padding: "14px 16px", fontSize: 13, color: "#9999bb" }}>{u.correo}</td>
                    <td style={{ padding: "14px 16px" }}>
                      <span style={{
                        background: `${colorCargo[u.cargo] ?? "#818cf8"}22`,
                        border: `1px solid ${colorCargo[u.cargo] ?? "#818cf8"}44`,
                        color: colorCargo[u.cargo] ?? "#818cf8",
                        borderRadius: 100, padding: "3px 10px", fontSize: 12,
                        textTransform: "capitalize",
                      }}>{u.cargo}</span>
                    </td>
                    <td style={{ padding: "14px 16px" }}>
                      <span style={{
                        background: activo ? "rgba(34,197,94,0.1)" : "rgba(239,68,68,0.1)",
                        border: `1px solid ${activo ? "rgba(34,197,94,0.3)" : "rgba(239,68,68,0.3)"}`,
                        color: activo ? "#4ade80" : "#f87171",
                        borderRadius: 100, padding: "3px 10px", fontSize: 12,
                      }}>{u.estado}</span>
                    </td>
                    <td style={{ padding: "14px 16px" }}>
                      <button
                        disabled={cargando || !permitido}
                        onClick={() => handleToggle(u)}
                        title={
                          !permitido
                            ? "No tienes permiso para cambiar el estado de este usuario"
                            : activo ? "Desactivar usuario" : "Activar usuario"
                        }
                        style={{
                          position: "relative",
                          width: 44, height: 24,
                          borderRadius: 100,
                          border: "none",
                          background: !permitido
                            ? "rgba(255,255,255,0.06)"
                            : activo ? "#6366f1" : "rgba(255,255,255,0.12)",
                          cursor: cargando || !permitido ? "not-allowed" : "pointer",
                          transition: "background 0.25s",
                          opacity: cargando ? 0.5 : !permitido ? 0.35 : 1,
                          flexShrink: 0,
                          display: "inline-block",
                        }}
                      >
                        <span style={{
                          position: "absolute",
                          top: 3, left: activo ? 23 : 3,
                          width: 18, height: 18,
                          borderRadius: "50%",
                          background: "#fff",
                          transition: "left 0.25s",
                          boxShadow: "0 1px 4px rgba(0,0,0,0.4)",
                        }} />
                      </button>
                    </td>
                  </tr>
                );
              })}
              {usuarios.length === 0 && (
                <tr>
                  <td colSpan={5} style={{ padding: "3rem", textAlign: "center", color: "#44445e", fontSize: 14 }}>
                    No hay usuarios registrados.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </main>
    </div>
  );
}

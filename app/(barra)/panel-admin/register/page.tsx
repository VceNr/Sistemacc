"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { registerUser } from "@/lib/api"; // Asegúrate de tener esta función en tu API
import { useAuth } from "@/lib/auth-context";

// ── Schema de validación ──────────────────────────────────────
const registerSchema = z
  .object({
    name: z.string().min(2, "El nombre debe tener al menos 2 caracteres."),
    email: z.string().email("Ingresa un correo electrónico válido."),
    cargo: z.enum(["analista", "admin"]),
    password: z
      .string()
      .min(9, "La contraseña debe tener más de 8 caracteres.")
      .regex(/[A-Z]/, "La contraseña debe tener al menos una mayúscula.")
      .regex(/[0-9]/, "La contraseña debe tener al menos un número.")
      .regex(/[^A-Za-z0-9]/, "La contraseña debe tener al menos un carácter especial."),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Las contraseñas no coinciden.",
    path: ["confirmPassword"],
  });

type RegisterSchema = z.infer<typeof registerSchema>;

// ── Componente ────────────────────────────────────────────────
export default function RegisterForm() {
  const router = useRouter();
  const { rol, nombre } = useAuth();
  const isSuperAdmin = rol === "super-admin";

  const form = useForm<RegisterSchema>({
    resolver: zodResolver(registerSchema),
    defaultValues: { name: "", email: "", cargo: "analista", password: "", confirmPassword: "" },
  });

  const loading = form.formState.isSubmitting;

  async function onSubmit(values: RegisterSchema) {
    // Guardia extra: solo el super-admin puede asignar cargo admin
    const cargo = isSuperAdmin ? values.cargo : "analista";
    const result = await registerUser(values.name, values.email, values.password, cargo);

    if (!result.success) {
      form.setError("root", { message: result.message });
      return;
    }

    // Redirección exitosa (puedes mandarlo al dashboard o al login)
    router.push("/panel-admin");
  }

  return (
    <>
      {/* ── Fuentes y Estilos ── */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@300;400;600&family=DM+Sans:wght@300;400;500&display=swap');

        .register-root {
          font-family: 'DM Sans', sans-serif;
          min-height: calc(100vh - 60px);
          display: flex;
          align-items: center;
          justify-content: center;
          background-color: #0a0a0f;
          background-image:
            radial-gradient(ellipse 80% 60% at 50% -10%, rgba(99,102,241,0.18) 0%, transparent 70%),
            radial-gradient(ellipse 40% 30% at 85% 90%, rgba(168,85,247,0.10) 0%, transparent 60%);
          padding: 1.5rem;
          position: relative;
          overflow: hidden;
        }

        /* Decoración de fondo */
        .register-root::before {
          content: '';
          position: absolute;
          inset: 0;
          background-image: 
            linear-gradient(rgba(255,255,255,0.018) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.018) 1px, transparent 1px);
          background-size: 48px 48px;
          pointer-events: none;
        }

        /* Orb decorativo */
        .register-orb {
          position: absolute;
          border-radius: 50%;
          filter: blur(80px);
          pointer-events: none;
          animation: orbFloat 8s ease-in-out infinite;
        }
        .register-orb-1 {
          width: 340px; height: 340px;
          background: rgba(99,102,241,0.12);
          top: -100px; right: -80px;
          animation-delay: 0s;
        }
        .register-orb-2 {
          width: 240px; height: 240px;
          background: rgba(168,85,247,0.10);
          bottom: -80px; left: -60px;
          animation-delay: -4s;
        }
        @keyframes orbFloat {
          0%, 100% { transform: translateY(0px) scale(1); }
          50%      { transform: translateY(-20px) scale(1.04); }
        }

        /* Tarjeta */
        .register-card {
          position: relative;
          width: 100%;
          max-width: 460px; /* Un poco más ancha para el registro */
          background: rgba(15, 15, 22, 0.85);
          backdrop-filter: blur(24px);
          -webkit-backdrop-filter: blur(24px);
          border: 1px solid rgba(255,255,255,0.07);
          border-radius: 20px;
          padding: 2.75rem 2.5rem 2rem;
          box-shadow:
            0 0 0 1px rgba(99,102,241,0.08),
            0 32px 64px -12px rgba(0,0,0,0.7),
            0 8px 24px -8px rgba(99,102,241,0.08);
          animation: cardIn 0.6s cubic-bezier(0.22,1,0.36,1) both;
        }
        @keyframes cardIn {
          from { opacity: 0; transform: translateY(24px) scale(0.97); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }

        /* Badge superior */
        .register-badge {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          background: rgba(99,102,241,0.12);
          border: 1px solid rgba(99,102,241,0.25);
          border-radius: 100px;
          padding: 4px 12px;
          margin-bottom: 1.5rem;
          font-size: 11px;
          font-weight: 500;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          color: #a5b4fc;
        }
        .register-badge-dot {
          width: 6px; height: 6px;
          border-radius: 50%;
          background: #818cf8;
          animation: pulse 2s ease-in-out infinite;
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50%      { opacity: 0.5; transform: scale(0.8); }
        }

        /* Títulos */
        .register-title {
          font-family: 'Cormorant Garamond', serif;
          font-size: 2.25rem;
          font-weight: 300;
          line-height: 1.15;
          color: #f0f0f5;
          letter-spacing: -0.01em;
          margin-bottom: 6px;
        }
        .register-title span {
          font-weight: 600;
          background: linear-gradient(135deg, #a5b4fc 0%, #c4b5fd 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }
        .register-subtitle {
          font-size: 0.84rem;
          color: #64648a;
          margin-bottom: 2rem;
          font-weight: 300;
        }

        /* Divider */
        .register-divider {
          height: 1px;
          background: linear-gradient(90deg, transparent, rgba(255,255,255,0.06), transparent);
          margin-bottom: 1.75rem;
        }

        /* Campos y Grid */
        .register-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 1rem;
        }
        
        .register-field {
          margin-bottom: 1.1rem;
          animation: fieldIn 0.5s cubic-bezier(0.22,1,0.36,1) both;
        }
        .register-field.full-width {
          grid-column: 1 / -1;
        }
        
        /* Retrasos en cascada para la animación de entrada */
        .register-field:nth-child(1) { animation-delay: 0.15s; }
        .register-field:nth-child(2) { animation-delay: 0.25s; }
        .register-field:nth-child(3) { animation-delay: 0.35s; }
        .register-field:nth-child(4) { animation-delay: 0.45s; }
        
        @keyframes fieldIn {
          from { opacity: 0; transform: translateX(-10px); }
          to   { opacity: 1; transform: translateX(0); }
        }

        .register-label {
          display: block;
          font-size: 0.72rem;
          font-weight: 500;
          letter-spacing: 0.09em;
          text-transform: uppercase;
          color: #6b6b94;
          margin-bottom: 7px;
        }

        .register-input-wrap {
          position: relative;
        }

        .register-input {
          width: 100%;
          background: rgba(255,255,255,0.035);
          border: 1px solid rgba(255,255,255,0.08);
          border-radius: 10px;
          padding: 11px 14px;
          font-size: 0.875rem;
          color: #e8e8f0;
          font-family: 'DM Sans', sans-serif;
          transition: border-color 0.2s, box-shadow 0.2s, background 0.2s;
          outline: none;
          box-sizing: border-box;
        }
        .register-input::placeholder { color: #3a3a5c; }
        .register-input:focus {
          border-color: rgba(99,102,241,0.5);
          background: rgba(99,102,241,0.05);
          box-shadow: 0 0 0 3px rgba(99,102,241,0.12);
        }

        /* Error global */
        .register-error {
          display: flex;
          align-items: flex-start;
          gap: 8px;
          background: rgba(239,68,68,0.08);
          border: 1px solid rgba(239,68,68,0.2);
          border-radius: 10px;
          padding: 10px 14px;
          font-size: 0.8rem;
          color: #f87171;
          margin-bottom: 1rem;
          animation: slideDown 0.3s ease;
        }
        @keyframes slideDown {
          from { opacity: 0; transform: translateY(-6px); }
          to   { opacity: 1; transform: translateY(0); }
        }

        /* Botón principal */
        .register-btn {
          width: 100%;
          margin-top: 1.5rem;
          padding: 12px;
          border-radius: 10px;
          border: none;
          background: linear-gradient(135deg, #6366f1 0%, #818cf8 100%);
          color: #fff;
          font-family: 'DM Sans', sans-serif;
          font-size: 0.875rem;
          font-weight: 500;
          letter-spacing: 0.03em;
          cursor: pointer;
          position: relative;
          overflow: hidden;
          transition: opacity 0.2s, transform 0.18s, box-shadow 0.2s;
          box-shadow: 0 4px 20px rgba(99,102,241,0.3);
        }
        .register-btn::after {
          content: '';
          position: absolute;
          inset: 0;
          background: linear-gradient(rgba(255,255,255,0.10), transparent);
          pointer-events: none;
        }
        .register-btn:hover:not(:disabled) {
          opacity: 0.92;
          transform: translateY(-1px);
          box-shadow: 0 8px 28px rgba(99,102,241,0.4);
        }
        .register-btn:active:not(:disabled) {
          transform: translateY(0px);
        }
        .register-btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        /* Spinner */
        .register-spinner {
          display: inline-block;
          width: 14px; height: 14px;
          border: 2px solid rgba(255,255,255,0.3);
          border-top-color: #fff;
          border-radius: 50%;
          animation: spin 0.7s linear infinite;
          margin-right: 8px;
          vertical-align: middle;
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        /* Footer */
        .register-footer {
          text-align: center;
          margin-top: 1.75rem;
          padding-top: 1.5rem;
          border-top: 1px solid rgba(255,255,255,0.05);
          font-size: 0.8rem;
          color: #44445e;
        }
        .register-footer a {
          color: #818cf8;
          font-weight: 500;
          text-decoration: none;
          position: relative;
          transition: color 0.2s;
        }
        .register-footer a::after {
          content: '';
          position: absolute;
          bottom: -1px; left: 0; right: 0;
          height: 1px;
          background: #818cf8;
          transform: scaleX(0);
          transform-origin: left;
          transition: transform 0.25s ease;
        }
        .register-footer a:hover { color: #a5b4fc; }
        .register-footer a:hover::after { transform: scaleX(1); }

        /* FormMessage override */
        [data-slot="form-message"] {
          font-size: 0.72rem !important;
          color: #f87171 !important;
          margin-top: 5px;
        }

        /* Select de cargo */
        .register-select {
          width: 100%;
          background: rgba(255,255,255,0.035);
          border: 1px solid rgba(255,255,255,0.08);
          border-radius: 10px;
          padding: 11px 14px;
          font-size: 0.875rem;
          color: #e8e8f0;
          font-family: 'DM Sans', sans-serif;
          transition: border-color 0.2s, box-shadow 0.2s, background 0.2s;
          outline: none;
          appearance: none;
          cursor: pointer;
        }
        .register-select:focus {
          border-color: rgba(99,102,241,0.5);
          background: rgba(99,102,241,0.05);
          box-shadow: 0 0 0 3px rgba(99,102,241,0.12);
        }
        .register-select option {
          background: #0f0f16;
          color: #e8e8f0;
        }

        /* Responsive */
        @media (max-width: 480px) {
          .register-grid {
            grid-template-columns: 1fr;
            gap: 0;
          }
        }
      `}</style>

      <nav style={{
        borderBottom: "1px solid rgba(255,255,255,0.07)", padding: "0 2rem",
        display: "flex", alignItems: "center", justifyContent: "space-between",
        height: "60px", background: "rgba(15,15,22,0.9)", backdropFilter: "blur(12px)",
        position: "sticky", top: 0, zIndex: 50, fontFamily: "DM Sans, sans-serif",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <button onClick={() => router.push("/panel-admin")} style={{
            background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)",
            borderRadius: 8, padding: "6px 14px", color: "#e8e8f0",
            fontSize: 13, cursor: "pointer", fontFamily: "inherit",
          }}>← Volver</button>
          <span style={{ fontWeight: 600, fontSize: 15, color: "#f0f0f5" }}>Crear Usuario</span>
        </div>
        <span style={{ fontSize: 13, color: "#64648a" }}>
          {nombre} — <span style={{ color: "#a5b4fc" }}>{rol}</span>
        </span>
      </nav>

      <div className="register-root">
        {/* Orbs */}
        <div className="register-orb register-orb-1" />
        <div className="register-orb register-orb-2" />

        <div className="register-card">
          {/* Badge */}
          <div className="register-badge">
            <span className="register-badge-dot" />
            Nueva Cuenta
          </div>

          {/* Header */}
          <h1 className="register-title">
            Únete a<br />la <span>plataforma.</span>
          </h1>
          <p className="register-subtitle">Completa tus datos para comenzar</p>

          <div className="register-divider" />

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} noValidate>

              {/* Error global */}
              {form.formState.errors.root && (
                <div className="register-error">
                  <svg width="15" height="15" viewBox="0 0 15 15" fill="none" style={{ flexShrink: 0, marginTop: 1 }}>
                    <circle cx="7.5" cy="7.5" r="7" stroke="#f87171" strokeWidth="1.2"/>
                    <path d="M7.5 4.5v4M7.5 10.5h.01" stroke="#f87171" strokeWidth="1.4" strokeLinecap="round"/>
                  </svg>
                  {form.formState.errors.root.message}
                </div>
              )}

              {/* Nombre Completo */}
              <div className="register-field full-width">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="register-label">Nombre Completo</FormLabel>
                      <FormControl>
                        <div className="register-input-wrap">
                          <input
                            type="text"
                            placeholder="Ej. Juan Pérez"
                            className="register-input"
                            {...field}
                          />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Email */}
              <div className="register-field full-width">
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="register-label">Correo electrónico</FormLabel>
                      <FormControl>
                        <div className="register-input-wrap">
                          <input
                            type="email"
                            placeholder="operador@logistica.com"
                            className="register-input"
                            {...field}
                          />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Cargo — solo super-admin puede asignar cargo admin */}
              {isSuperAdmin ? (
                <div className="register-field full-width">
                  <FormField
                    control={form.control}
                    name="cargo"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="register-label">Cargo</FormLabel>
                        <FormControl>
                          <select className="register-select" {...field}>
                            <option value="analista">Analista</option>
                            <option value="admin">Admin</option>
                          </select>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              ) : (
                <input type="hidden" {...form.register("cargo")} value="analista" />
              )}

              {/* Contraseñas en Grid (Lado a Lado en Desktop) */}
              <div className="register-grid">
                {/* Contraseña */}
                <div className="register-field">
                  <FormField
                    control={form.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="register-label">Contraseña</FormLabel>
                        <FormControl>
                          <div className="register-input-wrap">
                            <input
                              type="password"
                              placeholder="••••••••"
                              className="register-input"
                              {...field}
                            />
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Confirmar Contraseña */}
                <div className="register-field">
                  <FormField
                    control={form.control}
                    name="confirmPassword"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="register-label">Confirmar</FormLabel>
                        <FormControl>
                          <div className="register-input-wrap">
                            <input
                              type="password"
                              placeholder="••••••••"
                              className="register-input"
                              {...field}
                            />
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              {/* Submit */}
              <button
                type="submit"
                className="register-btn"
                disabled={loading}
              >
                {loading && <span className="register-spinner" />}
                {loading ? "Creando cuenta..." : "Crear cuenta"}
              </button>

            </form>
          </Form>

          {/* Footer */}
        </div>
      </div>
    </>
  );
}
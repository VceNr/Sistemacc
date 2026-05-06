"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button"; // Si no lo usas, lo puedes quitar
import { Input } from "@/components/ui/input";   // Si no lo usas, lo puedes quitar
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { loginUser } from "@/lib/api"; // Asegúrate de que la ruta sea correcta según tu proyecto

// ── Schema de validación ──────────────────────────────────────
const loginSchema = z.object({
  email: z.string().email("Ingresa un correo electrónico válido."),
  password: z
    .string()
    .min(8, "La contraseña debe tener al menos 8 caracteres."),
});

type LoginSchema = z.infer<typeof loginSchema>;

// ── Componente ────────────────────────────────────────────────
export default function LoginForm() {
  const router = useRouter();

  const form = useForm<LoginSchema>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  const loading = form.formState.isSubmitting;

  async function onSubmit(values: LoginSchema) {
    // Llamamos a la API que ahora usa Firebase Auth + Firestore
    const result = await loginUser(values.email, values.password);

    if (!result.success) {
      // Si falla (credenciales incorrectas, inactivo, etc.), mostramos el error
      form.setError("root", { message: result.message });
      return;
    }

    // ¡AQUÍ ESTÁ LA MAGIA! 
    // Usamos el redirectUrl que viene del backend según el cargo del usuario
    if (result.redirectUrl) {
      router.push(result.redirectUrl);
    } else {
      // Por si acaso falla la ruta, un fallback de seguridad
      router.push("/");
    }
  }

  return (
    <>
      {/* ── Fuentes ── */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@300;400;600&family=DM+Sans:wght@300;400;500&display=swap');

        .login-root {
          font-family: 'DM Sans', sans-serif;
          min-height: 100vh;
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
        .login-root::before {
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
        .login-orb {
          position: absolute;
          border-radius: 50%;
          filter: blur(80px);
          pointer-events: none;
          animation: orbFloat 8s ease-in-out infinite;
        }
        .login-orb-1 {
          width: 340px; height: 340px;
          background: rgba(99,102,241,0.12);
          top: -100px; right: -80px;
          animation-delay: 0s;
        }
        .login-orb-2 {
          width: 240px; height: 240px;
          background: rgba(168,85,247,0.10);
          bottom: -80px; left: -60px;
          animation-delay: -4s;
        }
        @keyframes orbFloat {
          0%, 100% { transform: translateY(0px) scale(1); }
          50%       { transform: translateY(-20px) scale(1.04); }
        }

        /* Tarjeta */
        .login-card {
          position: relative;
          width: 100%;
          max-width: 420px;
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
        .login-badge {
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
        .login-badge-dot {
          width: 6px; height: 6px;
          border-radius: 50%;
          background: #818cf8;
          animation: pulse 2s ease-in-out infinite;
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50%       { opacity: 0.5; transform: scale(0.8); }
        }

        /* Títulos */
        .login-title {
          font-family: 'Cormorant Garamond', serif;
          font-size: 2.25rem;
          font-weight: 300;
          line-height: 1.15;
          color: #f0f0f5;
          letter-spacing: -0.01em;
          margin-bottom: 6px;
        }
        .login-title span {
          font-weight: 600;
          background: linear-gradient(135deg, #a5b4fc 0%, #c4b5fd 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }
        .login-subtitle {
          font-size: 0.84rem;
          color: #64648a;
          margin-bottom: 2rem;
          font-weight: 300;
        }

        /* Divider */
        .login-divider {
          height: 1px;
          background: linear-gradient(90deg, transparent, rgba(255,255,255,0.06), transparent);
          margin-bottom: 1.75rem;
        }

        /* Campos */
        .login-field {
          margin-bottom: 1.1rem;
          animation: fieldIn 0.5s cubic-bezier(0.22,1,0.36,1) both;
        }
        .login-field:nth-child(1) { animation-delay: 0.15s; }
        .login-field:nth-child(2) { animation-delay: 0.25s; }
        @keyframes fieldIn {
          from { opacity: 0; transform: translateX(-10px); }
          to   { opacity: 1; transform: translateX(0); }
        }

        .login-label {
          display: block;
          font-size: 0.72rem;
          font-weight: 500;
          letter-spacing: 0.09em;
          text-transform: uppercase;
          color: #6b6b94;
          margin-bottom: 7px;
        }

        .login-input-wrap {
          position: relative;
        }

        .login-input {
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
        .login-input::placeholder { color: #3a3a5c; }
        .login-input:focus {
          border-color: rgba(99,102,241,0.5);
          background: rgba(99,102,241,0.05);
          box-shadow: 0 0 0 3px rgba(99,102,241,0.12);
        }

        /* Error global */
        .login-error {
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
        .login-btn {
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
        .login-btn::after {
          content: '';
          position: absolute;
          inset: 0;
          background: linear-gradient(rgba(255,255,255,0.10), transparent);
          pointer-events: none;
        }
        .login-btn:hover:not(:disabled) {
          opacity: 0.92;
          transform: translateY(-1px);
          box-shadow: 0 8px 28px rgba(99,102,241,0.4);
        }
        .login-btn:active:not(:disabled) {
          transform: translateY(0px);
        }
        .login-btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        /* Spinner */
        .login-spinner {
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
        .login-footer {
          text-align: center;
          margin-top: 1.75rem;
          padding-top: 1.5rem;
          border-top: 1px solid rgba(255,255,255,0.05);
          font-size: 0.8rem;
          color: #44445e;
        }
        .login-footer a {
          color: #818cf8;
          font-weight: 500;
          text-decoration: none;
          position: relative;
          transition: color 0.2s;
        }
        .login-footer a::after {
          content: '';
          position: absolute;
          bottom: -1px; left: 0; right: 0;
          height: 1px;
          background: #818cf8;
          transform: scaleX(0);
          transform-origin: left;
          transition: transform 0.25s ease;
        }
        .login-footer a:hover { color: #a5b4fc; }
        .login-footer a:hover::after { transform: scaleX(1); }

        /* Enlace "olvidé contraseña" */
        .login-forgot {
          display: flex;
          justify-content: flex-end;
          margin-top: 6px;
        }
        .login-forgot a {
          font-size: 0.75rem;
          color: #44445e;
          text-decoration: none;
          transition: color 0.2s;
        }
        .login-forgot a:hover { color: #818cf8; }

        /* FormMessage override */
        [data-slot="form-message"] {
          font-size: 0.72rem !important;
          color: #f87171 !important;
          margin-top: 5px;
        }
      `}</style>

      <div className="login-root">
        {/* Orbs */}
        <div className="login-orb login-orb-1" />
        <div className="login-orb login-orb-2" />

        <div className="login-card">
          {/* Badge */}
          <div className="login-badge">
            <span className="login-badge-dot" />
            Acceso seguro
          </div>

          {/* Header */}
          <h1 className="login-title">
            Bienvenido<br />de <span>vuelta.</span>
          </h1>
          <p className="login-subtitle">Ingresa tus credenciales para continuar</p>

          <div className="login-divider" />

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} noValidate>

              {/* Error global */}
              {form.formState.errors.root && (
                <div className="login-error">
                  <svg width="15" height="15" viewBox="0 0 15 15" fill="none" style={{ flexShrink: 0, marginTop: 1 }}>
                    <circle cx="7.5" cy="7.5" r="7" stroke="#f87171" strokeWidth="1.2"/>
                    <path d="M7.5 4.5v4M7.5 10.5h.01" stroke="#f87171" strokeWidth="1.4" strokeLinecap="round"/>
                  </svg>
                  {form.formState.errors.root.message}
                </div>
              )}

              {/* Email */}
              <div className="login-field">
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="login-label">Correo electrónico</FormLabel>
                      <FormControl>
                        <div className="login-input-wrap">
                          <input
                            type="email"
                            placeholder="juan@ejemplo.com"
                            className="login-input"
                            {...field}
                          />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Contraseña */}
              <div className="login-field">
                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="login-label">Contraseña</FormLabel>
                      <FormControl>
                        <div className="login-input-wrap">
                          <input
                            type="password"
                            placeholder="••••••••"
                            className="login-input"
                            {...field}
                          />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="login-forgot">
                  <Link href="/forgot-password">¿Olvidaste tu contraseña?</Link>
                </div>
              </div>

              {/* Submit */}
              <button
                type="submit"
                className="login-btn"
                disabled={loading}
              >
                {loading && <span className="login-spinner" />}
                {loading ? "Verificando..." : "Iniciar sesión"}
              </button>

            </form>
          </Form>

          {/* Footer */}
          <div className="login-footer">
            ¿No tienes cuenta?&nbsp;
            <Link href="/register">Regístrate aquí</Link>
          </div>
        </div>
      </div>
    </>
  );
}
"use client";

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
import { loginUser } from "@/lib/api";

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
    const result = await loginUser(values.email, values.password);

    if (!result.success) {
      form.setError("root", { message: result.message });
      return;
    }

    if (result.redirectUrl) {
      router.push(result.redirectUrl);
    } else {
      router.push("/");
    }
  }

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@300;400;600&family=DM+Sans:wght@300;400;500&display=swap');

        /* ── Layout raíz ── */
        .login-root {
          font-family: 'DM Sans', sans-serif;
          height: 100vh;
          max-height: 100vh;
          display: flex;
          background-color: #0a0a0f;
          position: relative;
          overflow: hidden;
        }

        /* Grid de fondo global */
        .login-root::before {
          content: '';
          position: absolute;
          inset: 0;
          background-image:
            linear-gradient(rgba(255,255,255,0.015) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.015) 1px, transparent 1px);
          background-size: 52px 52px;
          pointer-events: none;
          z-index: 0;
        }

        /* ── Panel izquierdo (hero) ── */
        .login-hero {
          position: relative;
          flex: 1;
          display: flex;
          flex-direction: column;
          justify-content: center;
          align-items: flex-start;
          padding: 3rem 3.5rem 3rem 4.5rem;
          background: linear-gradient(135deg,
            rgba(99,102,241,0.10) 0%,
            rgba(168,85,247,0.06) 50%,
            transparent 100%);
          border-right: 1px solid rgba(255,255,255,0.05);
          z-index: 1;
          overflow: hidden;
        }

        /* Orb decorativo hero */
        .hero-orb {
          position: absolute;
          border-radius: 50%;
          filter: blur(90px);
          pointer-events: none;
          animation: orbFloat 9s ease-in-out infinite;
        }
        .hero-orb-1 {
          width: 420px; height: 420px;
          background: rgba(99,102,241,0.14);
          top: -120px; left: -80px;
          animation-delay: 0s;
        }
        .hero-orb-2 {
          width: 300px; height: 300px;
          background: rgba(168,85,247,0.10);
          bottom: -80px; right: 0px;
          animation-delay: -4.5s;
        }
        @keyframes orbFloat {
          0%, 100% { transform: translateY(0) scale(1); }
          50%       { transform: translateY(-22px) scale(1.04); }
        }

        /* Marca superior */
        .hero-brand {
          display: flex;
          align-items: center;
          gap: 10px;
          margin-bottom: 1.75rem;
        }
        .hero-brand-icon {
          width: 36px; height: 36px;
          background: linear-gradient(135deg, #6366f1, #a78bfa);
          border-radius: 10px;
          display: flex; align-items: center; justify-content: center;
          box-shadow: 0 4px 16px rgba(99,102,241,0.4);
        }
        .hero-brand-name {
          font-family: 'DM Sans', sans-serif;
          font-size: 1rem;
          font-weight: 600;
          color: #e8e8f0;
          letter-spacing: 0.02em;
        }
        .hero-brand-name span {
          color: #818cf8;
        }

        /* Título hero */
        .hero-title {
          font-family: 'Cormorant Garamond', serif;
          font-size: clamp(1.9rem, 2.6vw, 2.7rem);
          font-weight: 300;
          line-height: 1.1;
          color: #f0f0f5;
          letter-spacing: -0.02em;
          margin-bottom: 0.6rem;
          max-width: 480px;
        }
        .hero-title strong {
          font-weight: 600;
          background: linear-gradient(135deg, #a5b4fc 0%, #c4b5fd 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }

        .hero-subtitle {
          font-size: 0.83rem;
          color: #5a5a7a;
          font-weight: 300;
          line-height: 1.6;
          max-width: 380px;
          margin-bottom: 1.25rem;
        }

        /* Chips de características */
        .hero-chips {
          display: flex;
          flex-direction: column;
          gap: 8px;
          margin-bottom: 1.5rem;
        }
        .hero-chip {
          display: flex;
          align-items: center;
          gap: 10px;
          font-size: 0.8rem;
          color: #6b6b94;
        }
        .hero-chip-icon {
          width: 28px; height: 28px;
          background: rgba(99,102,241,0.10);
          border: 1px solid rgba(99,102,241,0.18);
          border-radius: 8px;
          display: flex; align-items: center; justify-content: center;
          flex-shrink: 0;
        }

        /* Ilustración SVG de seguridad */
        .hero-illustration {
          position: relative;
          width: 100%;
          max-width: 380px;
          animation: illFloat 6s ease-in-out infinite;
        }
        @keyframes illFloat {
          0%, 100% { transform: translateY(0); }
          50%       { transform: translateY(-10px); }
        }

        /* Línea decorativa inferior */
        .hero-footer-line {
          position: absolute;
          bottom: 2rem;
          left: 5rem;
          font-size: 0.72rem;
          color: #2e2e48;
          letter-spacing: 0.1em;
          text-transform: uppercase;
        }

        /* ── Panel derecho (formulario) ── */
        .login-panel {
          position: relative;
          width: 580px;
          flex-shrink: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 2rem;
          z-index: 1;
          overflow: hidden;
        }

        /* Orbs del panel derecho */
        .login-orb {
          position: absolute;
          border-radius: 50%;
          filter: blur(70px);
          pointer-events: none;
          animation: orbFloat 8s ease-in-out infinite;
        }
        .login-orb-1 {
          width: 260px; height: 260px;
          background: rgba(99,102,241,0.10);
          top: -60px; right: -40px;
          animation-delay: -2s;
        }
        .login-orb-2 {
          width: 200px; height: 200px;
          background: rgba(168,85,247,0.08);
          bottom: -60px; left: -30px;
          animation-delay: -5s;
        }

        /* Tarjeta */
        .login-card {
          position: relative;
          width: 100%;
          max-width: 480px;
          background: rgba(15, 15, 22, 0.90);
          backdrop-filter: blur(24px);
          -webkit-backdrop-filter: blur(24px);
          border: 1px solid rgba(255,255,255,0.07);
          border-radius: 20px;
          padding: 2.75rem 2.5rem 2rem;
          box-shadow:
            0 0 0 1px rgba(99,102,241,0.08),
            0 32px 64px -12px rgba(0,0,0,0.8),
            0 8px 24px -8px rgba(99,102,241,0.10);
          animation: cardIn 0.6s cubic-bezier(0.22,1,0.36,1) both;
        }
        @keyframes cardIn {
          from { opacity: 0; transform: translateY(24px) scale(0.97); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }

        /* Badge */
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

        /* Títulos card */
        .login-title {
          font-family: 'Cormorant Garamond', serif;
          font-size: 2.1rem;
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
          font-size: 0.83rem;
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

        .login-input-wrap { position: relative; }

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
          position: absolute; inset: 0;
          background: linear-gradient(rgba(255,255,255,0.10), transparent);
          pointer-events: none;
        }
        .login-btn:hover:not(:disabled) {
          opacity: 0.92;
          transform: translateY(-1px);
          box-shadow: 0 8px 28px rgba(99,102,241,0.4);
        }
        .login-btn:active:not(:disabled) { transform: translateY(0px); }
        .login-btn:disabled { opacity: 0.6; cursor: not-allowed; }

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
        @keyframes spin { to { transform: rotate(360deg); } }

        /* Forgot */
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

        /* ── Responsive ── */
        @media (max-width: 900px) {
          .login-hero { display: none; }
          .login-panel {
            width: 100%;
            min-height: 100vh;
            height: auto;
            padding: 1.5rem;
            align-items: center;
          }
          .login-card {
            padding: 2rem 1.75rem 1.75rem;
          }
        }

        @media (max-width: 480px) {
          .login-panel {
            padding: 1rem;
          }
          .login-card {
            padding: 1.75rem 1.25rem 1.5rem;
            border-radius: 16px;
          }
          .login-title {
            font-size: 1.75rem;
          }
        }

        @media (max-width: 360px) {
          .login-card {
            padding: 1.5rem 1rem 1.25rem;
          }
          .login-title {
            font-size: 1.5rem;
          }
          .login-btn {
            padding: 11px;
            font-size: 0.82rem;
          }
        }
      `}</style>

      <div className="login-root">

        {/* ══ PANEL IZQUIERDO — HERO ══ */}
        <div className="login-hero">
          <div className="hero-orb hero-orb-1" />
          <div className="hero-orb hero-orb-2" />

          {/* Marca */}
          <div className="hero-brand">
            <div className="hero-brand-icon">
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                <path d="M10 2L3 5.5V10c0 4.1 3 7.7 7 8.5 4-0.8 7-4.4 7-8.5V5.5L10 2Z" fill="white" fillOpacity="0.9"/>
              </svg>
            </div>
            <span className="hero-brand-name">Sistema<span>CC</span></span>
          </div>

          {/* Título */}
          <h1 className="hero-title">
            Gestión de<br />hallazgos de<br /><strong>seguridad.</strong>
          </h1>
          <p className="hero-subtitle">
            Plataforma centralizada para el registro, seguimiento y auditoría de hallazgos en Infopuntos.
          </p>

          {/* Características */}
          <div className="hero-chips">
            {[
              {
                icon: (
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                    <path d="M7 1L1.5 3.75V7c0 3 2.1 5.6 5.5 6.5C10.4 12.6 12.5 10 12.5 7V3.75L7 1Z" stroke="#818cf8" strokeWidth="1.2" fill="none"/>
                    <path d="M4.5 7l1.8 1.8L9.5 5.5" stroke="#818cf8" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                ),
                text: "Acceso por roles",
              },
              {
                icon: (
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                    <rect x="1.5" y="5" width="11" height="8" rx="2" stroke="#818cf8" strokeWidth="1.2"/>
                    <path d="M4.5 5V3.5a2.5 2.5 0 0 1 5 0V5" stroke="#818cf8" strokeWidth="1.2" strokeLinecap="round"/>
                    <circle cx="7" cy="9" r="1.2" fill="#818cf8"/>
                  </svg>
                ),
                text: "Autenticación segura",
              },
              {
                icon: (
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                    <path d="M2 4h10M2 7h7M2 10h5" stroke="#818cf8" strokeWidth="1.2" strokeLinecap="round"/>
                  </svg>
                ),
                text: "Registro y auditoría completa de hallazgos",
              },
            ].map((chip, i) => (
              <div className="hero-chip" key={i}>
                <div className="hero-chip-icon">{chip.icon}</div>
                {chip.text}
              </div>
            ))}
          </div>

          {/* Ilustración SVG de seguridad */}
          <div className="hero-illustration">
            <svg viewBox="0 0 380 220" fill="none" xmlns="http://www.w3.org/2000/svg" width="100%">
              {/* Fondo tarjeta central */}
              <rect x="60" y="20" width="260" height="180" rx="16" fill="rgba(99,102,241,0.06)" stroke="rgba(99,102,241,0.18)" strokeWidth="1"/>

              {/* Escudo principal */}
              <path d="M190 45L155 62V90c0 24 15.5 45 35 51 19.5-6 35-27 35-51V62L190 45Z"
                fill="rgba(99,102,241,0.15)" stroke="#6366f1" strokeWidth="1.5"/>
              <path d="M190 55l-25 12.5V84c0 17 11 31.5 25 36 14-4.5 25-19 25-36V67.5L190 55Z"
                fill="rgba(99,102,241,0.12)" stroke="#818cf8" strokeWidth="1"/>
              {/* Check dentro escudo */}
              <path d="M178 88l7 7 13-13" stroke="#a5b4fc" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>

              {/* Líneas de datos a la izquierda */}
              <rect x="80" y="50" width="55" height="6" rx="3" fill="rgba(99,102,241,0.25)"/>
              <rect x="80" y="62" width="40" height="5" rx="2.5" fill="rgba(99,102,241,0.15)"/>
              <rect x="80" y="73" width="48" height="5" rx="2.5" fill="rgba(99,102,241,0.15)"/>
              <rect x="80" y="84" width="35" height="5" rx="2.5" fill="rgba(99,102,241,0.10)"/>

              {/* Líneas de datos a la derecha */}
              <rect x="245" y="50" width="55" height="6" rx="3" fill="rgba(168,85,247,0.25)"/>
              <rect x="250" y="62" width="40" height="5" rx="2.5" fill="rgba(168,85,247,0.15)"/>
              <rect x="247" y="73" width="48" height="5" rx="2.5" fill="rgba(168,85,247,0.15)"/>
              <rect x="253" y="84" width="35" height="5" rx="2.5" fill="rgba(168,85,247,0.10)"/>

              {/* Barra de estado inferior */}
              <rect x="90" y="150" width="200" height="30" rx="8" fill="rgba(255,255,255,0.03)" stroke="rgba(255,255,255,0.07)" strokeWidth="1"/>
              {/* Dot verde */}
              <circle cx="108" cy="165" r="5" fill="rgba(74,222,128,0.3)" stroke="#4ade80" strokeWidth="1"/>
              <circle cx="108" cy="165" r="2.5" fill="#4ade80"/>
              {/* Texto simulado */}
              <rect x="120" y="161" width="60" height="4" rx="2" fill="rgba(255,255,255,0.10)"/>
              <rect x="186" y="161" width="30" height="4" rx="2" fill="rgba(99,102,241,0.20)"/>
              {/* Escudo mini derecha barra */}
              <path d="M262 159l-5 2.5V165c0 2.8 1.8 5.2 5 6 3.2-.8 5-3.2 5-6v-3.5L262 159Z"
                fill="rgba(99,102,241,0.2)" stroke="#818cf8" strokeWidth="1"/>

              {/* Partículas flotantes */}
              <circle cx="85" cy="120" r="3" fill="rgba(99,102,241,0.35)"/>
              <circle cx="295" cy="115" r="2.5" fill="rgba(168,85,247,0.35)"/>
              <circle cx="140" cy="135" r="2" fill="rgba(99,102,241,0.20)"/>
              <circle cx="240" cy="138" r="2" fill="rgba(168,85,247,0.20)"/>
            </svg>
          </div>

          <p className="hero-footer-line">© 2025 SistemaCC — Todos los derechos reservados</p>
        </div>

        {/* ══ PANEL DERECHO — FORMULARIO ══ */}
        <div className="login-panel">
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
          </div>
        </div>

      </div>
    </>
  );
}

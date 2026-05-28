import type { NextConfig } from "next";

const securityHeaders = [
  // Evita que el navegador adivine el tipo de contenido (MIME sniffing)
  { key: "X-Content-Type-Options",    value: "nosniff" },
  // Bloquea clickjacking — la app no puede cargarse en iframes externos
  { key: "X-Frame-Options",           value: "DENY" },
  // Fuerza HTTPS permanentemente (1 año) + preload list
  { key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains; preload" },
  // Limita información de referrer al origen
  { key: "Referrer-Policy",           value: "strict-origin-when-cross-origin" },
  // Desactiva APIs sensibles del navegador
  { key: "Permissions-Policy",        value: "camera=(), microphone=(), geolocation=(), payment=()" },
  // Protege contra ataques Spectre en navegadores modernos
  { key: "Cross-Origin-Opener-Policy",   value: "same-origin" },
  { key: "Cross-Origin-Resource-Policy", value: "same-origin" },
  // Content Security Policy
  {
    key: "Content-Security-Policy",
    value: [
      "default-src 'self'",
      // unsafe-eval solo en desarrollo (React lo requiere para call stacks); en producción se elimina
      `script-src 'self' 'unsafe-inline'${process.env.NODE_ENV === "development" ? " 'unsafe-eval'" : ""}`,
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "font-src 'self' https://fonts.gstatic.com",
      "img-src 'self' data: blob: https://firebasestorage.googleapis.com",
      "connect-src 'self' https://*.googleapis.com https://*.firebaseio.com wss://*.firebaseio.com https://identitytoolkit.googleapis.com https://securetoken.googleapis.com https://firestore.googleapis.com https://storage.googleapis.com",
      "frame-src 'none'",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      "upgrade-insecure-requests",
    ].join("; "),
  },
];

// Headers adicionales para rutas con datos sensibles (admin)
const noCacheHeaders = [
  { key: "Cache-Control",  value: "no-store, no-cache, must-revalidate, proxy-revalidate" },
  { key: "Pragma",         value: "no-cache" },
  { key: "Surrogate-Control", value: "no-store" },
];

const nextConfig: NextConfig = {
  experimental: {
    useCache: true,
  },
  logging: {
    serverFunctions: false, // Evita que Next.js registre argumentos de Server Actions en terminal
  },
  async headers() {
    return [
      // Seguridad general para todas las rutas
      {
        source: "/(.*)",
        headers: securityHeaders,
      },
      // No cachear páginas admin — contienen datos sensibles de seguridad
      {
        source: "/panel-admin",
        headers: noCacheHeaders,
      },
      {
        source: "/panel-admin/:path*",
        headers: noCacheHeaders,
      },
    ];
  },
};

export default nextConfig;

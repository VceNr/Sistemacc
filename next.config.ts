import type { NextConfig } from "next";

const securityHeaders = [
  // Evita que el navegador adivine el tipo de contenido (MIME sniffing)
  { key: "X-Content-Type-Options",    value: "nosniff" },
  // Bloquea clickjacking — la app no puede cargarse en iframes externos
  { key: "X-Frame-Options",           value: "DENY" },
  // Fuerza HTTPS en producción (1 año)
  { key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains" },
  // Limita información de referrer al origen
  { key: "Referrer-Policy",           value: "strict-origin-when-cross-origin" },
  // Desactiva APIs sensibles del navegador
  { key: "Permissions-Policy",        value: "camera=(), microphone=(), geolocation=()" },
  // Content Security Policy
  {
    key: "Content-Security-Policy",
    value: [
      // Solo recursos del mismo origen por defecto
      "default-src 'self'",
      // Scripts: propio origen + Next.js inline (nonce no disponible aquí, se permite unsafe-inline con precaución)
      "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
      // Estilos: propio + Google Fonts + inline (necesario para los <style> en JSX)
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      // Fuentes: Google Fonts
      "font-src 'self' https://fonts.gstatic.com",
      // Imágenes: propio + Firebase Storage + data URIs
      "img-src 'self' data: blob: https://firebasestorage.googleapis.com",
      // Conexiones: propio + Firebase APIs (Auth, Firestore, Storage)
      "connect-src 'self' https://*.googleapis.com https://*.firebaseio.com wss://*.firebaseio.com https://identitytoolkit.googleapis.com https://securetoken.googleapis.com https://firestore.googleapis.com https://storage.googleapis.com",
      // Sin frames externos
      "frame-src 'none'",
      // Sin objetos embebidos
      "object-src 'none'",
      // Base URI restringida al propio origen
      "base-uri 'self'",
      // Solo formularios al propio origen
      "form-action 'self'",
    ].join("; "),
  },
];

const nextConfig: NextConfig = {
  experimental: {
    useCache: true,
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;

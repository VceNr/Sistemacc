/**
 * Logger centralizado.
 * - Desarrollo: logs visibles en consola para facilitar debugging.
 * - Producción: no-op — no se filtra ninguna traza ni detalle de implementación.
 */
const isProd = process.env.NODE_ENV === "production";
const noop   = (..._args: unknown[]) => {};

/* eslint-disable no-console */
export const logger = {
  error: isProd ? noop : console.error.bind(console),
  warn:  isProd ? noop : console.warn.bind(console),
  log:   isProd ? noop : console.log.bind(console),
} as const;
/* eslint-enable no-console */

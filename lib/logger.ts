/**
 * Logger centralizado.
 * En producción (NODE_ENV === "production") todos los métodos son no-op
 * para evitar filtrar información de implementación, dependencias o trazas.
 * En desarrollo funciona normalmente para facilitar el debugging.
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const noop = (..._args: unknown[]) => {};

/**
 * Los errores se manejan en la UI (mensajes al usuario).
 * No se expone ninguna traza, ruta interna ni detalle de dependencias en consola.
 */
export const logger = {
  error: noop,
  warn:  noop,
  log:   noop,
} as const;

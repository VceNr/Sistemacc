
const isProd = process.env.NODE_ENV === "production";
const noop   = (..._args: unknown[]) => {};


export const logger = {
  error: isProd ? noop : console.error.bind(console),
  warn:  isProd ? noop : console.warn.bind(console),
  log:   isProd ? noop : console.log.bind(console),
} as const;


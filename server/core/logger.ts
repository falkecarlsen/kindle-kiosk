type LogLevel = "info" | "warn" | "error" | "debug";

const shouldDebug = !!process.env.DEBUG;

function format(level: LogLevel, message: string): string {
  const ts = new Date().toISOString();
  return `[${ts}] [${level.toUpperCase()}] ${message}`;
}

export const logger = {
  info(msg: string) {
    console.log(format("info", msg));
  },
  warn(msg: string) {
    console.warn(format("warn", msg));
  },
  error(msg: string) {
    console.error(format("error", msg));
  },
  debug(msg: string) {
    if (shouldDebug) console.debug(format("debug", msg));
  },
};

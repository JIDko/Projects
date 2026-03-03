type LogLevel = 'debug' | 'info' | 'warn' | 'error';

const LEVELS: Record<LogLevel, number> = { debug: 0, info: 1, warn: 2, error: 3 };
const VALID_LEVELS = new Set<string>(['debug', 'info', 'warn', 'error']);
const rawLevel = process.env['LOG_LEVEL'] ?? 'info';
const currentLevel: LogLevel = VALID_LEVELS.has(rawLevel) ? (rawLevel as LogLevel) : 'info';

function log(level: LogLevel, message: string, data?: unknown): void {
  if (LEVELS[level]! < LEVELS[currentLevel]!) return;
  const timestamp = new Date().toISOString();
  const prefix = `[${timestamp}] [${level.toUpperCase()}]`;
  if (data !== undefined) {
    console.log(prefix, message, typeof data === 'string' ? data : JSON.stringify(data, null, 2));
  } else {
    console.log(prefix, message);
  }
}

export const logger = {
  debug: (msg: string, data?: unknown) => log('debug', msg, data),
  info: (msg: string, data?: unknown) => log('info', msg, data),
  warn: (msg: string, data?: unknown) => log('warn', msg, data),
  error: (msg: string, data?: unknown) => log('error', msg, data),
};

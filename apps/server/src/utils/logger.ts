import pino from 'pino';
import config from '../config/index.js';

/**
 * Structured logger using Pino
 */
export const logger = pino({
    level: config.logLevel,
    transport: config.nodeEnv === 'development' ? {
        target: 'pino-pretty',
        options: {
            colorize: true,
            translateTime: 'SYS:standard',
            ignore: 'pid,hostname',
        },
    } : undefined,
    base: {
        env: config.nodeEnv,
    },
    timestamp: pino.stdTimeFunctions.isoTime,
});

/**
 * Create a child logger with additional context
 */
export function createChildLogger(context: Record<string, unknown>) {
    return logger.child(context);
}

/**
 * Log levels for easy access
 */
export const LogLevel = {
    DEBUG: 'debug',
    INFO: 'info',
    WARN: 'warn',
    ERROR: 'error',
    FATAL: 'fatal',
} as const;

export default logger;


import { errstr } from "../result/index.ts";

/** 
 * String-enum for logging levels
 *
 * off - no logging at all
 * default - warning and errors only
 * info - warning, errors, info
 * debug - warning, errors, info, debug
 */
export type LogLevelStr = "off" | "info" | "debug" | "default";

export const LogLevel = { Off: 0, High: 1, Info: 2, Debug: 3 } as const;
export type LogLevel = (typeof LogLevel)[keyof typeof LogLevel];

let globalLevel: LogLevel = LogLevel.High;
/**
 * Suppress ALL logging.
 *
 * This overrides logger-level settings
 */
export const globalLogOff = () => {
    globalLevel = LogLevel.Off;
};
/**
 * Enable +info logging for ALL loggers
 *
 * This overrides logger-level settings
 */
export const globalLogInfo = () => {
    globalLevel = LogLevel.Info;
};
/**
 * Enable +debug logging for ALL loggers
 *
 * This overrides logger-level settings
 */
export const globalLogDebug = () => {
    globalLevel = LogLevel.Debug;
};

/** Create a logger creator. Use the factory methods to finish making the logger */
export const logger = (name: string, color?: string): LoggerFactory => {
    return {
        default: () => new LoggerImpl(name, color, LogLevel.High),
        debug: () => new LoggerImpl(name, color, LogLevel.Debug),
        info: () => new LoggerImpl(name, color, LogLevel.Info),
        off: () => new LoggerImpl(name, color, LogLevel.Off),
    };
};

/** Create a {@link ResettableLogger} that can be easily reconfigured */
export const resettableLogger = (name: string, color?: string): ResettableLogger => {
    const logger = new LoggerImpl(name, color, LogLevel.High);
    return {
        logger,
        debug: () => (logger.level = LogLevel.Debug),
        info: () => (logger.level = LogLevel.Info),
        off: () => (logger.level = LogLevel.Off),
    };
};

/**
 * A logger whose level can be changed later. Useful for libraries to expose,
 * so users can easily debug calls in the library
 */
export interface ResettableLogger  {
    logger: Logger;
    debug(): void;
    info(): void;
    off(): void;
};

export type LoggerFactory =  {
    /** Standard important logger (warning and errors) */
    default(): Logger;
    /** Enable +info +debug logging for this logger */
    debug(): Logger;
    /** Enable +info logging for this logger */
    info(): Logger;
    /** Stop all logging, including warn and error */
    off(): Logger;
};

export interface Logger {
    /** Log a debug message */
    debug(obj: unknown): void;
    /** Log an info message */
    info(obj: unknown): void;
    /** Log a warning message */
    warn(obj: unknown): void;
    /** Log an error message */
    error(obj: unknown): void;
};

export class LoggerImpl implements Logger {
    name: string;
    color: string | undefined;
    level: LogLevel;

    constructor(name: string, color: string | undefined, level: LogLevel) {
        this.name = name;
        this.color = "padding:0 3x;color:white" + (color ? `;background:${color}` : "");
        this.level = level;
    }

    debug(obj: unknown) {
        if (globalLevel !== LogLevel.Debug && this.level !== LogLevel.Debug) {
            return;
        }
        console.debug(
            `%cDEBUG%c${this.name}%c ${obj}`,
            "background:gray;color:white;padding:0 3px",
            this.color,
            "color:inherit;background:inherit",
        );
    }

    info(obj: unknown) {
        if (globalLevel < LogLevel.Info && this.level < LogLevel.Info) {
            return;
        }
        console.info(
            `%cINFO%c${this.name}%c ${obj}`,
            "background:green;color:white;padding:0 3px",
            this.color,
            "color:inherit;background:inherit",
        );
    }

    warn(obj: unknown) {
        if (globalLevel < LogLevel.High || this.level < LogLevel.High) {
            return;
        }
        console.warn(
            `%cWARN%c${this.name}%c ${obj}`,
            "background:orange;color:white;padding:0 3px",
            this.color,
            "color:inherit;background:inherit",
        );
    }

    error(obj: unknown) {
        if (globalLevel < LogLevel.High || this.level < LogLevel.High) {
            return;
        }
        const msg = errstr(obj);
        console.error(
            `%cERROR%c${this.name}%c ${msg}`,
            "background:darkred;color:white;padding:0 3px",
            this.color,
            "color:inherit;background:inherit",
        );
        if (msg !== obj) {
            console.error(obj);
        }
    }
}

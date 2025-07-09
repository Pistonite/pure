/**
 * Client side log util
 *
 * This is rather simple logging stuff with the primary focus
 * being easy to debug.
 *
 * Use {@link logger} to create a logger with a name and a color,
 * then use one of the {@link LoggerFactory} methods to setup the logging level.
 *
 * There are 3 levels of logging:
 * 1. (Default) Warnings and Errors only
 * 2. Also log info messages
 * 3. Also log debug messages.
 *
 * Each logger can turn on info and debug logging separately, or it can
 * be turned on at the global level for debugging.
 *
 * You can also turn off each logger individually or at global level for debugging.
 *
 * Due to the nature of JS, all logging calls, even when turned off, will incur
 * some small runtime overhead. While we could remove debug calls
 * for release build, that's currently not done (and it would require
 * bundler to inline the call to remove the call completely, which might
 * not be the case)
 *
 * @module
 */

import { errstr } from "../result/index.ts";

export const LogLevel = {
    Off: 0,
    High: 1,
    Info: 2,
    Debug: 3,
} as const;
export type LogLevel = (typeof LogLevel)[keyof typeof LogLevel];

let globalLevel: LogLevel = LogLevel.High;
/**
 * Suppress ALL logging.
 *
 * This overrides logger-level settings
 */
export const globalLogOff = () => (globalLevel = 0);
/**
 * Enable +info logging for ALL loggers
 *
 * This overrides logger-level settings
 */
export const globalLogInfo = () => (globalLevel = 2);
/**
 * Enable +debug logging for ALL loggers
 *
 * This overrides logger-level settings
 */
export const globalLogDebug = () => (globalLevel = 3);

/** Create a logger creator. Use the factory methods to finish making the logger */
export const logger = (name: string, color?: string): LoggerFactory => {
    return {
        default: () => new LoggerImpl(name, color, LogLevel.High),
        debug: () => new LoggerImpl(name, color, LogLevel.Debug),
        info: () => new LoggerImpl(name, color, LogLevel.Info),
        off: () => new LoggerImpl(name, color, LogLevel.Off),
    };
};

export type LoggerFactory = {
    /** Standard important logger (warning and errors) */
    default(): Logger;
    /** Enable +info +debug logging for this logger */
    debug(): Logger;
    /** Enable +info logging for this logger */
    info(): Logger;
    /** Stop all logging, including warn and error */
    off(): Logger;
};

export type Logger = {
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
        this.color =
            "padding:0 3x;color:white" + (color ? `;background:${color}` : "");
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

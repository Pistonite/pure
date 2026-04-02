import { errstr } from "../result/index.ts";

/**
 * String-enum for logging levels
 *
 * off - no logging at all
 * default - warning and errors only
 * info - warning, errors, info
 * debug - warning, errors, info, debug
 */

const LogLevel = { off: 0, default: 1, info: 2, debug: 3 } as const;
export type LogLevelStr = "off" | "default" | "info" | "debug";
if (import.meta.vitest) {
    const { test, expectTypeOf } = import.meta.vitest;
    test("type LogLevelStr", () => {
        expectTypeOf<LogLevelStr>().toEqualTypeOf<keyof typeof LogLevel>();
    });
}
type LogLevel = (typeof LogLevel)[LogLevelStr];

/** Args for constructing a logger */
export interface LoggerConstructor {
    /** CSS Color for the logger, default is 'gray' */
    color?: string;
    /**
     * Logging level, default is "default".
     * The level can still be changed later with setLevel
     */
    level?: LogLevelStr;
}

/** The logger type */
export interface Logger {
    /** Set the level of the logger */
    setLevel(level: LogLevelStr): void;
    /** Log a debug message */
    debug(obj: unknown): void;
    /** Log an info message */
    info(obj: unknown): void;
    /** Log a warning message */
    warn(obj: unknown): void;
    /** Log an error message */
    error(obj: unknown): void;
}

/** Create a logger creator. Use the factory methods to finish making the logger */
export const logger = (name: string, args: LoggerConstructor): Logger => {
    const { color, level } = args;
    const levelObj = LogLevel[level || "off"] || LogLevel.off;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if ((globalThis as any).process) {
        return new BareLoggerImpl(name, levelObj);
    }
    const color2 = color || "gray";
    return new CssLoggerImpl(name, color2, levelObj);
};

class BareLoggerImpl implements Logger {
    constructor(
        private name: string,
        private level: LogLevel,
    ) {}
    setLevel(level: LogLevelStr): void {
        this.level = LogLevel[level] || LogLevel["off"];
    }
    debug(obj: unknown): void {
        if (this.level !== LogLevel.debug) {
            return;
        }
        console.debug(`DEBUG [${this.name}] ${obj}`);
    }
    info(obj: unknown): void {
        if (this.level < LogLevel.info) {
            return;
        }
        console.info(`INFO [${this.name}] ${obj}`);
    }
    warn(obj: unknown): void {
        if (this.level < LogLevel.default) {
            return;
        }
        console.warn(`WARN [${this.name}] ${obj}`);
    }
    error(obj: unknown): void {
        if (this.level < LogLevel.default) {
            return;
        }
        const msg = errstr(obj);
        console.error(`ERROR [${this.name}] ${msg}`);
        if (msg !== obj) {
            console.error(obj);
        }
    }
}

class CssLoggerImpl implements Logger {
    constructor(
        private name: string,
        private color: string,
        private level: LogLevel,
    ) {}
    setLevel(level: LogLevelStr): void {
        this.level = LogLevel[level] || LogLevel["off"];
    }
    debug(obj: unknown): void {
        if (this.level !== LogLevel.debug) {
            return;
        }
        console.debug(
            `%cDEBUG%c${this.name}%c ${obj}`,
            "background:gray;color:white;padding:0 3px",
            this.color,
            "color:inherit;background:inherit",
        );
    }
    info(obj: unknown): void {
        if (this.level < LogLevel.info) {
            return;
        }
        console.info(
            `%cINFO%c${this.name}%c ${obj}`,
            "background:green;color:white;padding:0 3px",
            this.color,
            "color:inherit;background:inherit",
        );
    }
    warn(obj: unknown): void {
        if (this.level < LogLevel.default) {
            return;
        }
        console.warn(
            `%cWARN%c${this.name}%c ${obj}`,
            "background:orange;color:white;padding:0 3px",
            this.color,
            "color:inherit;background:inherit",
        );
    }
    error(obj: unknown): void {
        if (this.level < LogLevel.default) {
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

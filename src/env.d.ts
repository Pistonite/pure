/// <reference types="mono-dev/vitest-types" />

declare const console: {
    log(...x: unknown): void;
    error(...x: unknown): void;
    info(...x: unknown): void;
    debug(...x: unknown): void;
    warn(...x: unknown): void;
};

declare function setTimeout(f: (...x: unknown[]) => void, timeout: number): unknown;

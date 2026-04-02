/**
 * Client side log util
 *
 * This is rather simple logging stuff with the primary focus
 * being easy-to-debug, instead of optimized for bundle size or performance.
 *
 * Because this library doesn't have global states, there is no "global" logger
 * or any global logger settings. Instead, each library or component of the
 * application can create their own instance of the logger, which stores
 * settings like the name, color and level of that logger.
 *
 * ```typescript
 * import { logger } from "@pistonite/pure";
 *
 * export const myLogger = logger("my-library", {
 *     color: "#ff8800", // any CSS color (note that styling only works in browser)
 * });
 * ```
 *
 * It's recommended that a library exports the logger object
 * so downstream app can modify the logging level if needed for debugging.
 * ```typescript
 * import { myLogger } from "my-library";
 *
 * myLogger.setLevel("debug");
 * ```
 *
 * Due to the nature of JS, all logging calls, even when turned off, will incur
 * some small runtime overhead. While we could remove debug calls
 * for release build, that's currently not done (and it would require
 * bundler to inline the call to remove the call completely, which might
 * not be the case)
 *
 * @module
 */
export { type LogLevelStr, type LoggerConstructor, type Logger, logger } from "./logger.ts";

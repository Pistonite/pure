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
export {
    globalLogOff,
    globalLogInfo,
    globalLogDebug,
    logger,
    type LoggerFactory,
    type Logger,
    resettableLogger,
    type ResettableLogger,
} from "./logger.ts";
export { internalLogOff, internalLogDebug, internalLogInfo } from "./internal.ts";

import { resettableLogger } from "./logger.ts";

const { logger, off, debug, info } = resettableLogger("pure", "gray");

export const ilog = logger;

/** Set the internal log level of calls in this library to off */
export const internalLogOff = off;

/** Set the internal log level of calls in this library to debug */
export const internalLogDebug = debug;

/** Set the internal log level of calls in this library to info */
export const internalLogInfo = info;

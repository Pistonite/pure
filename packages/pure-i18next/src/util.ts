import { resettableLogger } from "@pistonite/pure/log";

const { logger, ...rest } = resettableLogger("pure-i18next", "gray");
export const log = logger;
/** Change the log level of this library */
export const logLevel = rest;

import { LoggerImpl, LogLevel } from "./logger.ts";

export const ilog: LoggerImpl = new LoggerImpl("pure", "gray", LogLevel.High);

/** Set the internal log level of calls in this library to off */
export const internalLogOff = () => {
    ilog.level = LogLevel.Off;
};

/** Set the internal log level of calls in this library to debug */
export const internalLogDebug = () => {
    ilog.level = LogLevel.Debug;
};

/** Set the internal log level of calls in this library to info */
export const internalLogInfo = () => {
    ilog.level = LogLevel.Info;
};

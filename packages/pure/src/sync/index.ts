/**
 * # pure/sync
 * JS synchronization utilities
 *
 * @module
 */
export {
    serial,
    type SerialConstructor,
    type SerialEventCancelCallback,
    type SerialCancelToken,
} from "./serial.ts";
export { latest, type LatestConstructor, type UpdateArgsFn } from "./latest.ts";
export { debounce, type DebounceConstructor } from "./debounce.ts";
export { batch, type BatchConstructor } from "./batch.ts";
export { once, type OnceConstructor } from "./once.ts";
export { makePromise, type PromiseHandle } from "./util.ts";
export { scopedCapture, scopedCaptureSync } from "./capture.ts";

// helper types
export type { AnyFn, AwaitRet } from "./util.ts";

// unstable
export { RwLock } from "./RwLock.ts";

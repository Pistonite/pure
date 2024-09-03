import type { Void, Err, VoidOk } from "../result/index.ts";

/**
 * An async event that can be cancelled when a new one starts
 *
 * ## Example
 *
 * ```typescript
 * import { SerialEvent } from "@pistonite/pure/sync";
 *
 * // helper function to simulate async work
 * const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
 *
 * // Create the event
 * const event = new SerialEvent();
 *
 * // The cancellation system uses the Result type
 * // and returns an error when it is cancelled
 * const promise1 = event.run(async (shouldCancel) => {
 *     for (let i = 0; i < 10; i++) {
 *          await wait(1000);
 *          const cancelResult = shouldCancel();
 *          if (cancelResult.err) {
 *              return cancelResult;
 *          }
 *     }
 *     return { val: 42 };
 * });
 *
 * await wait(3000);
 *
 * // calling event.run a second time will cause `shouldCancel` to return false
 * // the next time it's called by the first event
 * const promise2 = event.run(async (shouldCancel) => {
 *     for (let i = 0; i < 10; i++) {
 *          await wait(1000);
 *          const cancelResult = shouldCancel();
 *          if (cancelResult.err) {
 *              return cancelResult;
 *          }
 *     }
 *     return { val: 43 };
 * });
 *
 * console.log(await promise1); // { err: "cancel" }
 * console.log(await promise2); // { val: 43 }
 * ```
 *
 * ## Getting the current serial number
 * The serial number has type `bigint` and is incremented every time `run` is called.
 *
 * The callback function receives the current serial number as the second argument, if you need it
 * ```typescript
 * import { SerialEvent } from "@pistonite/pure/sync";
 *
 * const event = new SerialEvent();
 * const promise = event.run(async (shouldCancel, serial) => {
 *    console.log(serial);
 *    return {};
 * });
 * ```
 *
 * ## Checking for cancel
 * It's the event handler's responsibility to check if the event is cancelled by
 * calling the `shouldCancel` function. This function returns an `Err` if it should be cancelled.
 *
 * ```typescript
 * import { SerialEvent } from "@pistonite/pure/sync";
 *
 * const event = new SerialEvent();
 * await event.run(async (shouldCancel, serial) => {
 *     // do some operations
 *     ...
 *
 *     const cancelResult = shouldCancel();
 *     if (cancelResult.err) {
 *         return cancelResult;
 *     }
 *
 *     // not cancelled, continue
 *     ...
 * });
 * ```
 * It's possible the operation is cheap enough that an outdated event should probably be let finish.
 * It's ok in that case to not call `shouldCancel`. The `SerialEvent` class checks it one
 * last time before returning the result after the callback finishes.
 *
 * ## Handling cancelled event
 * To check if an event is completed or cancelled, simply `await`
 * on the promise returned by `event.run` and check the `err`
 * ```typescript
 * import { SerialEvent } from "@pistonite/pure/sync";
 *
 * const event = new SerialEvent();
 * const result = await event.run(async (shouldCancel) => {
 *     // your code here ...
 * );
 * if (result.err === "cancel") {
 *     console.log("event was cancelled");
 * } else {
 *     console.log("event completed");
 * }
 * ```
 *
 * You can also pass in a callback to the constructor, which will be called
 * when the event is cancelled. This event is guaranteed to fire at most once per run
 * ```typescript
 * import { SerialEvent } from "@pistonite/pure/sync";
 *
 * const event = new SerialEvent((current, latest) => {
 *     console.log(`Event with serial ${current} is cancelled because the latest serial is ${latest}`);
 * });
 * ```
 *
 *
 */
export class SerialEvent {
    private serial: bigint;
    private onCancel: SerialEventCancelCallback;

    constructor(onCancel?: SerialEventCancelCallback) {
        this.serial = 0n;
        if (onCancel) {
            this.onCancel = onCancel;
        } else {
            this.onCancel = () => {};
        }
    }

    public async run<T = VoidOk>(
        callback: SerialEventCallback<T>,
    ): Promise<T | Err<SerialEventCancelToken>> {
        let cancelled = false;
        const currentSerial = ++this.serial;
        const shouldCancel = () => {
            if (currentSerial !== this.serial) {
                if (!cancelled) {
                    cancelled = true;
                    this.onCancel(currentSerial, this.serial);
                }
                return { err: "cancel" as const };
            }
            return {};
        };
        const result = await callback(shouldCancel, currentSerial);
        const cancelResult = shouldCancel();
        if (cancelResult.err) {
            return cancelResult;
        }
        return result;
    }
}

/**
 * The callback type passed to SerialEvent constructor to be called
 * when the event is cancelled
 */
export type SerialEventCancelCallback = (
    current: bigint,
    latest: bigint,
) => void;

/** The callback type passed to SerialEvent.run */
export type SerialEventCallback<T = VoidOk> = (
    shouldCancel: () => Void<SerialEventCancelToken>,
    current: bigint,
) => Promise<T | Err<SerialEventCancelToken>>;

/** The error type received by caller when an event is cancelled */
export type SerialEventCancelToken = "cancel";

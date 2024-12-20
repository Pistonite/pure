import type { Result } from "../result/index.ts";

/**
 * An async event that is cancelled when a new one starts.
 * When a new event is started, the previous caller will receive a
 * cancellation error, instead of being hung up indefinitely.
 *
 * ## Example
 *
 * ```typescript
 * import { serial } from "@pistonite/pure/sync";
 *
 * // helper function to simulate async work
 * const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
 *
 * // Create the wrapped function
 * const execute = serial({
 *     // This has to be curried for type inferrence
 *     fn: (checkCancel) => async () => {
 *         for (let i = 0; i < 10; i++) {
 *             await wait(1000);
 *             // The cancellation mechanism throws an error if is cancelled
 *             checkCancel();
 *         }
 *         return 42;
 *     }
 * });
 *
 * // execute it the first time
 * const promise1 = execute();
 * await wait(3000);
 *
 * // calling event.run a second time will cause `checkCancel` to return false
 * // the next time it's called by the first event
 * const promise2 = execute();
 *
 * console.log(await promise1); // { err: "cancel" }
 * console.log(await promise2); // { val: 42 }
 * ```
 *
 * ## Passing in arguments
 * TypeScript magic is used to ensure full type-safety when passing in arguments.
 *
 * ```typescript
 * import { serial } from "@pistonite/pure/sync";
 *
 * const execute = serial({
 *    fn: (checkCancel) => async (arg1: number, arg2: string) => {
 *
 *        // do something with arg1 and arg2
 *        console.log(arg1, arg2);
 *
 *        // ...
 *    }
 * });
 *
 * expectTypeOf(execute)
 *     .toEqualTypeOf<(arg1: number, arg2: string) => Promise<Result<void, "cancel">>>();
 *
 * await execute(42, "hello"); // no type error!
 * ```
 *
 * ## Getting the current serial number
 * The serial number has type `bigint` and is incremented every time `run` is called.
 *
 * You can have an extra argument after `checkCancel`, that will receive the current serial number,
 * if you need it for some reason.
 * ```typescript
 * import { serial } from "@pistonite/pure/sync";
 *
 * const execute = serial({
 *     fn: async (checkCancel, serial) => {
 *         console.log(serial);
 *     }
 * });
 *
 * await execute(); // 1n
 * ```
 *
 * ## Checking for cancel
 * It's the event handler's responsibility to check if the event is cancelled by
 * calling the `checkCancel` function. This function will throw if the event
 * is cancelled, and the error will be caught by the wrapper and returned as an `Err`
 *
 * ```typescript
 * import { Serial } from "@pistonite/pure/sync";
 *
 * const execute = serial({
 *     fn: async (shouldCancel) => {
 *         // do some operations
 *         // ...
 *
 *         const cancelResult = shouldCancel();
 *         if (cancelResult.err) {
 *             return cancelResult;
 *         }
 *
 *         // not cancelled, continue
 *         // ...
 *     }
 * });
 * ```
 *
 * Note that even if you don't check it, there is one final check before the result is returned.
 * So you will never get a result from a cancelled event. Also note that you only need to check
 * after any `await` calls. If there's no `await`, everything is executed synchronously,
 * and it's impossible to cancel the event.
 *
 * ## Handling cancelled event
 * To check if an event is completed or cancelled, simply `await`
 * on the promise check the `err`
 * ```typescript
 * import { serial } from "@pistonite/pure/sync";
 *
 * const execute = serial({
 *     fn: async (checkCancel) => {
 *         // your code here ...
 *     }
 * });
 * const result = await execute();
 * if (result.err === "cancel") {
 *     console.log("event was cancelled");
 * } else {
 *     console.log("event completed");
 * }
 * ```
 *
 * You can also pass in a callback to the constructor, which will be called
 * when the event is cancelled. The cancel callback is guaranteed to only fire at most once per run
 * ```typescript
 * import { Serial } from "@pistonite/pure/sync";
 *
 * const onCancel = (current: bigint, latest: bigint) => {
 *     console.log(`Event with serial ${current} is cancelled because the latest serial is ${latest}`);
 * };
 *
 * const execute = new Serial({
 *     fn: ...,
 *     onCancel,
 * });
 * ```
 */

export function serial<
TFn extends 
(...args: any[]) => any

>({fn, onCancel}: SerialConstructor<TFn>) {
    const impl = new Serial(fn, onCancel);
    return (...args: Parameters<TFn>) => impl.invoke(...args);
}

/**
 * Options for `serial` function
 */
export type SerialConstructor<TFn> = {
    /**
     * Function creator that returns the async function to be wrapped
     */
    fn: (checkCancel: ShouldCancelFn, current?: SerialId) => TFn;
    /**
     * Optional callback to be called when the event is cancelled
     *
     * This is guaranteed to be only called at most once per execution
     */
    onCancel?: SerialEventCancelCallback;
}

class Serial<TFn extends (...args: any[]) => any> {
    private serial: SerialId;
    private fn: SerialFnCreator<TFn>;
    private onCancel: SerialEventCancelCallback;

    constructor(fn: SerialFnCreator<TFn>, onCancel?: SerialEventCancelCallback) {
        this.fn = fn;
        this.serial = 0n;
        if (onCancel) {
            this.onCancel = onCancel;
        } else {
            this.onCancel = () => {};
        }
    }

    public async invoke(...args: Parameters<TFn>): Promise<Result<Awaited<ReturnType<TFn>>, SerialCancelToken>> {
        let cancelled = false;
        const currentSerial = ++this.serial;
        const shouldCancel = () => {
            if (currentSerial !== this.serial) {
                if (!cancelled) {
                    cancelled = true;
                    this.onCancel(currentSerial, this.serial);
                }
                throw new Error("cancelled");
            }
        };
        const fn = this.fn;
        // note: no typechecking for "result"
        try {
            const result = await fn(shouldCancel, currentSerial)(...args);
            if (cancelled) {
                return { err: "cancel" };
            }
            return { val: result };
        } catch (e) {
            if (cancelled) {
                return { err: "cancel" };
            }
            throw e;
        }
    }
}

type SerialId = bigint;
type ShouldCancelFn = () => void;
type SerialFnCreator<T> = (checkCancel: ShouldCancelFn, serial: SerialId) => T;

/**
 * The callback type passed to SerialEvent constructor to be called
 * when the event is cancelled
 */
export type SerialEventCancelCallback = (
    current: SerialId,
    latest: SerialId,
) => void;

/** The error type received by caller when an event is cancelled */
export type SerialCancelToken = "cancel";

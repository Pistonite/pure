import { type AnyFn, type AwaitRet, makePromise, type PromiseHandle } from "./util.ts";

/**
 * An async event wrapper that always resolve to the result of the latest
 * call
 *
 * ## Example
 * In the example below, both call will return the result
 * of the second call (2)
 * ```typescript
 * import { latest } from "@pistonite/pure/sync";
 *
 * let counter = 0;
 *
 * const execute = latest({
 *     fn: async () => {
 *         counter++;
 *         await new Promise((resolve) => setTimeout(() => {
 *             resolve(counter);
 *         }, 1000));
 *     }
 * });
 *
 * const result1 = execute();
 * const result2 = execute();
 * console.log(await result1); // 2
 * console.log(await result2); // 2
 * ```
 *
 * ## Advanced Usage
 * See the constructor options for more advanced usage, for example,
 * control how arguments are updated when new calls are made.
 */
export function latest<TFn extends AnyFn>({
    fn,
    areArgsEqual,
    updateArgs,
}: LatestConstructor<TFn>) {
    const impl = new LatestImpl(fn, areArgsEqual, updateArgs);
    return (...args: Parameters<TFn>) => impl.invoke(...args);
}

export type LatestConstructor<TFn extends AnyFn> = {
    /** Function to be wrapped */
    fn: TFn;

    /**
     * Optional function to compare if arguments of 2 calls are equal.
     *
     * By default, separate calls are considered different, and the result
     * of the latest call will be returned. However, if the function is pure,
     * and the argument of a new call is the same as the call being executed,
     * then the result of the call being executed will be returned. In other words,
     * the new call will not result in another execution of the function.
     */
    areArgsEqual?: (a: Parameters<TFn>, b: Parameters<TFn>) => boolean;

    /**
     * Optional function to update the arguments.
     *
     * By default, when new calls are made while the previous call is being executed,
     * The function will be executed again with the latest arguments. This function
     * is used to change this behavior and is called when new calls are made. In other words,
     * the default value for this function is `(_current, _middle, latest) => latest`.
     *
     * The arguments are:
     * - `current`: The arguments of the call currently being executed
     * - `latest`: The argument of this new call
     * - `middle`: If more than one call is made while the previous call is being executed,
     *   this array contains arguments of the calls between `current` and `latest`
     * - `next`: This is the returned value of the previous call to updateArgs, i.e. the args
     *   to be executed next.
     *
     */
    updateArgs?: UpdateArgsFn<TFn>;
};
export type UpdateArgsFn<TFn extends AnyFn> = (
    current: Parameters<TFn>,
    middle: Parameters<TFn>[],
    latest: Parameters<TFn>,
    next: Parameters<TFn> | undefined,
) => Parameters<TFn>;
export class LatestImpl<TFn extends AnyFn> {
    private pending?: PromiseHandle<AwaitRet<TFn>>;

    /** current arguments. undefined means no current call */
    private currentArgs?: Parameters<TFn>;
    /** next arguments. undefined means no newer call */
    private nextArgs?: Parameters<TFn>;

    private middleArgs: Parameters<TFn>[];

    private areArgsEqual: (a: Parameters<TFn>, b: Parameters<TFn>) => boolean;
    private updateArgs: UpdateArgsFn<TFn>;

    constructor(
        private fn: TFn,
        areArgsEqual?: (a: Parameters<TFn>, b: Parameters<TFn>) => boolean,
        updateArgs?: UpdateArgsFn<TFn>,
    ) {
        this.middleArgs = [];
        this.areArgsEqual = areArgsEqual || (() => false);
        this.updateArgs = updateArgs || ((_current, _middle, latest) => latest);
    }

    public async invoke(...args: Parameters<TFn>): Promise<AwaitRet<TFn>> {
        if (this.pending) {
            // pending means currentArgs is not undefined
            const currentArgs = this.currentArgs as Parameters<TFn>;
            const nextArgs = this.updateArgs(currentArgs, this.middleArgs, args, this.nextArgs);
            if (this.areArgsEqual(nextArgs, currentArgs)) {
                // do not schedule new call
                this.nextArgs = undefined;
            } else {
                this.nextArgs = nextArgs;
            }
            return this.pending.promise;
        }

        // assign to next args to make the loop cleaner
        this.nextArgs = args;

        this.pending = makePromise();
        let error = undefined;
        let result;
        while (this.nextArgs) {
            this.currentArgs = this.nextArgs;
            this.nextArgs = undefined;
            try {
                const fn = this.fn;
                result = await fn(...this.currentArgs);
            } catch (e) {
                error = e;
            }
        }
        this.currentArgs = undefined;
        const pending = this.pending;
        this.pending = undefined;
        if (error) {
            pending.reject(error);
            throw error;
        } else {
            pending.resolve(result);
            return result;
        }
    }
}

import { makePromise } from "./util.ts";

/**
 * An async event that is guaranteed to:
 * - Not re-fire in a minimal interval after it's initialially fired.
 * - All calls will eventually fire
 *
 * The caller will get a promise that resolves the next time the event is fired
 * and resolved.
 *
 * Unlike the naive implementation with a setTimeout, this implementation
 * will not starve the event. If it's constantly being called,
 * it will keep firing the event at at least the minimum interval (might
 * take longer if the underlying function takes longer to execute
 *
 * ## Simple Example
 *
 * Multiple calls will be debounced to the minimum interval
 * ```typescript
 * import { debounce } from "@pistonite/pure/sync";
 *
 * const execute = debounce({
 *     fn: () => {
 *         console.log("called");
 *     }
 *     interval: 100,
 * });
 * await execute(); // resolved immediately
 * await execute(); // resolved after 100ms
 * ```
 *
 * ## Discarding extra calls
 * When making multiple calls, if the call is currently being debounced
 * (i.e. executed and the minimum interval hasn't passed), new calls
 * will replace the previous call.
 *
 * If you want to the in-between calls to be preserved,
 * use `batch` instead.
 *
 * ```typescript
 * import { debounce } from "@pistonite/pure/sync";
 *
 * const execute = debounce({
 *     fn: (n: number) => {
 *         console.log(n);
 *     }
 *     interval: 100,
 * });
 * await execute(1); // logs 1 immediately
 * const p1 = execute(2); // will be resolved at 100ms
 * await new Promise((resolve) => setTimeout(resolve, 50));
 * await Promise.all[p1, execute(3)]; // will be resolved at 100ms, discarding the 2nd call
 * // 1, 3 will be logged
 * ```
 *
 * ## Slow function
 * By default, the debouncer takes into account the time
 * it takes for the underlying function to execute. It starts
 * the next cycle as soon as both the minimul interval has passed
 * and the function has finished executing. This ensures only
 * 1 call is being executed at a time.
 *
 * However, if you want the debouncer to always debounce at the set interval,
 * regardless of if the previous call has finished, set `disregardExecutionTime`
 * to true.
 *
 * ```typescript
 * import { debounce } from "@pistonite/pure/sync";
 *
 * const execute = debounce({
 *     fn: async (n: number) => {
 *         await new Promise((resolve) => setTimeout(resolve, 150));
 *         console.log(n);
 *     },
 *     interval: 100,
 *     // without this, will debounce at the interval of 150ms
 *     disregardExecutionTime: true,
 * });
 * ```
 */
export function debounce<TFn extends (...args: any[]) => any>({ fn, interval, disregardExecutionTime }: DebounceConstructor<TFn>) {
    const impl = new Debounce(fn, interval, disregardExecutionTime || false);
    return (...args: Parameters<TFn>) => impl.invoke(...args);
}

/**
 * Options for `debounce` function
 */
export type DebounceConstructor<TFn> = {
    /** Function to be debounced */
    fn: TFn;
    /**
     * Minimum interval between each call
     *
     * Setting this to <= 0 will make the debounce function
     * a pure pass-through, not actually debouncing the function
     */
    interval: number;

    /**
     * By default, the debouncer takes in account the time
     * the underlying function executes. i.e. the actual debounce
     * interval is `max(interval, executionTime)`. This default
     * behavior guanrantees that no 2 calls will be executed concurrently.
     *
     * If you want the debouncer to always debounce at the set interval,
     * set this to true.
     */
    disregardExecutionTime?: boolean;
};


class Debounce<TFn extends (...args: any[]) => any> {
    private idle: boolean;
    private next?: { 
        args: Parameters<TFn>,
        promise: 
        Promise<Awaited<ReturnType<TFn>>>, 
        resolve?: (result: Awaited<ReturnType<TFn>>) => void, 
        reject?: (error: any) => void
    };
    constructor(
        private fn: TFn,
        private interval: number,
        private disregardExecutionTime: boolean,
    ) {
        this.idle = true;
    }

    public invoke(...args: Parameters<TFn>): Promise<Awaited<ReturnType<TFn>>> {
        if (this.idle) {
            this.idle = false;
            return this.execute(...args);
        }
        if (!this.next) {
            this.next = { args, ...makePromise<Awaited<ReturnType<TFn>>>()};
        } else {
            this.next.args = args;
        }
        return this.next.promise;
    }

    private scheduleNext() {
        const next = this.next;
        if (next) {
            this.next = undefined;
            const { args, resolve, reject } = next;
            void this.execute(...args).then(resolve, reject);
            return;
        }
        this.idle = true;
    }

    private async execute(...args: Parameters<TFn>): Promise<Awaited<ReturnType<TFn>>> {
        const fn = this.fn;
        let done = this.disregardExecutionTime;
        setTimeout(() => {
            if (done) {
                this.scheduleNext();
            } else {
                done = true;
            }
        }, this.interval);
        try {
            return await fn(...args);
        } finally {
            if (!this.disregardExecutionTime) {
                if (done) {
                    // interval already passed, we need to call it
                    this.scheduleNext();
                } else {
                    done = true;
                }
            }
        }
  }
}

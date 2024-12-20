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
            let resolve;
            let reject;
            const promise = new Promise<Awaited<ReturnType<TFn>>>((res, rej) => {
                resolve = res;
                reject = rej;
                });
            this.next = { args, promise, resolve, reject };
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

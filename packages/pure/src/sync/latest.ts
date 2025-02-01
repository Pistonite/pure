import { makePromise } from "./util.ts";

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
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function latest<TFn extends (...args: any[]) => any>({
    fn,
}: LatestConstructor<TFn>) {
    const impl = new LatestImpl(fn);
    return (...args: Parameters<TFn>) => impl.invoke(...args);
}

export type LatestConstructor<TFn> = {
    /** Function to be wrapped */
    fn: TFn;
};
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export class LatestImpl<TFn extends (...args: any[]) => any> {
    private hasNewer: boolean;
    private pending?: {
        promise: Promise<Awaited<ReturnType<TFn>>>;
        resolve: (result: Awaited<ReturnType<TFn>>) => void;
        reject: (error: unknown) => void;
    };

    constructor(private fn: TFn) {
        this.hasNewer = false;
    }

    public async invoke(
        ...args: Parameters<TFn>
    ): Promise<Awaited<ReturnType<TFn>>> {
        if (this.pending) {
            this.hasNewer = true;
            return this.pending.promise;
        }
        this.pending = makePromise<Awaited<ReturnType<TFn>>>();
        let error = undefined;
        let result;
        while (true) {
            this.hasNewer = false;
            try {
                const fn = this.fn;
                result = await fn(...args);
            } catch (e) {
                error = e;
            }
            if (!this.hasNewer) {
                break;
            }
        }
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

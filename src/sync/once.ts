import { type AnyFn, type AwaitRet, makePromise } from "./util.ts";

/**
 * An async event wrapper that ensures an async initialization is only ran once.
 * Any subsequent calls after the first call will return a promise that resolves/rejects
 * with the result of the first call.
 *
 * ## Example
 * ```typescript
 * import { once } from "@pistonite/pure/sync";
 *
 * const getLuckyNumber = once({
 *     fn: async () => {
 *          console.log("running expensive initialization...")
 *          await new Promise((resolve) => setTimeout(resolve, 100));
 *          console.log("done")
 *          return 42;
 *     }
 * });
 *
 * const result1 = getLuckyNumber();
 * const result2 = getLuckyNumber();
 * console.log(await result1);
 * console.log(await result2);
 * // logs:
 * // running expensive initialization...
 * // done
 * // 42
 * // 42
 * ```
 *
 * ## Caveat with HMR
 * Some initialization might require clean up, such as unregister
 * event handlers and/or timers. In this case, a production build might
 * work fine but a HMR (Hot Module Reload) development server might not
 * do this for you automatically.
 *
 * One way to work around this during development is to store the cleanup
 * as a global object
 * ```typescript
 * const getResourceThatNeedsCleanup = once({
 *     fn: async () => {
 *         if (__DEV__) { // Configure your bundler to inject this
 *             // await if you need async clean up
 *             await (window as any).cleanupMyResource?.();
 *         }
 *
 *         let resource: MyResource;
 *         if (__DEV__) {
 *             (window as any).cleanupMyResource = async () => {
 *                 await resource?.cleanup();
 *             };
 *         }
 *
 *         resource = await initResource();
 *         return resource;
 *     }
 * });
 * ```
 *
 * An alternative solution is to not use `once` but instead tie the initialization
 * of the resource to some other lifecycle event that gets cleaned up during HMR.
 * For example, A framework that supports HMR for React components might unmount
 * the component before reloading, which gives you a chance to clean up the resource.
 *
 * This is not an issue if the resource doesn't leak other resources,
 * since it will eventually be GC'd.
 */
export function once<TFn extends AnyFn>({ fn }: OnceConstructor<TFn>) {
    const impl = new OnceImpl(fn);
    return (...args: Parameters<TFn>) => impl.invoke(...args);
}

export type OnceConstructor<TFn> = {
    /** Function to be called only once */
    fn: TFn;
};

export class OnceImpl<TFn extends AnyFn> {
    private promise: Promise<AwaitRet<TFn>> | undefined;

    constructor(private fn: TFn) {
        this.fn = fn;
    }

    public async invoke(...args: Parameters<TFn>): Promise<AwaitRet<TFn>> {
        if (this.promise) {
            return this.promise;
        }
        const { promise, resolve, reject } = makePromise<AwaitRet<TFn>>();
        this.promise = promise;
        try {
            const result = await this.fn(...args);
            resolve(result);
            return result;
        } catch (e) {
            reject(e);
            throw e;
        }
    }
}

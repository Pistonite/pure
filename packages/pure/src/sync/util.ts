/**
 * Make a {@link PromiseHandle} with the promise object separate from
 * its resolve and reject methods
 */
export const makePromise = <T>(): PromiseHandle<T> => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let resolve: any;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let reject: any;
    const promise = new Promise<T>((res, rej) => {
        resolve = res;
        reject = rej;
    });
    return { promise, resolve, reject };
};

/**
 * A handle of the promise that breaks down the promise object
 * and its resolve and reject functions
 */
export type PromiseHandle<T> = {
    promise: Promise<T>;
    resolve: (value: T | PromiseLike<T>) => void;
    reject: (reason?: unknown) => void;
};

/** Shorthand for Awaited<ReturnType<T>> */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type AwaitRet<T> = T extends (...args: any[]) => infer R
    ? Awaited<R>
    : never;

/** Type for any function */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type AnyFn = (...args: any[]) => any;

export const makePromise = <T>(): {
    promise: Promise<T>;
    resolve: (value: T | PromiseLike<T>) => void;
    reject: (reason?: any) => void;
} => {
    let resolve;
    let reject;
    const promise = new Promise<T>((res, rej) => {
        resolve = res;
        reject = rej;
    });
    if (!resolve || !reject) {
        throw new Error(
            "Promise callbacks not set. This is a bug in the JS engine!",
        );
    }
    return {
        promise,
        resolve,
        reject,
    };
};

/** Shorthand for Awaited<ReturnType<T>> */
export type AwaitRet<T> = T extends (...args: any[]) => infer R
    ? Awaited<R>
    : never;

import Deque from "denque";

import { makePromise } from "./util.ts";

/**
 * Non-reentrant mutex
 *
 * This allows only one context to enter a block at a time in a FIFO manner.
 *
 * This mutex is non-reentrant. Trying to lock it again while the same
 * context already owns the lock will cause a dead lock.
 *
 * While a context id can be used to implement reentrant locks,
 * it is very cumbersome to use. https://github.com/tc39/proposal-async-context
 * will allow for a cleaner implementation.
 *
 * ## Example
 *
 * ```typescript
 * import { Mutex } from "@pistonite/pure/sync";
 *
 * const mutex = new Mutex();
 * let counter = 0;
 *
 * const increment = async () => {
 *     await mutex.scopedLock(async () => {
 *         // only one context can be inside this block at a time,
 *         // so the read-modify-write below is never interleaved
 *         const current = counter;
 *         await new Promise((resolve) => setTimeout(resolve, 10));
 *         counter = current + 1;
 *     });
 * };
 *
 * await Promise.all([increment(), increment(), increment()]);
 * console.log(counter); // 3
 * ```
 *
 * The value returned by the closure is returned to the caller, and exceptions
 * thrown by the closure are re-thrown to the caller. The lock is released
 * in both cases.
 *
 * ## Fairness
 * The lock is handed off directly to the context that has been waiting the longest,
 * so waiters are guaranteed to acquire the lock in the order they called
 * {@link scopedLock}. A context that starts waiting while the lock is being
 * released cannot barge in front of the contexts already waiting.
 */
export class Mutex {
    private locked: boolean = false;
    private waiters: Deque<() => void> = new Deque();

    /** Check if the mutex is currently locked by some context */
    public get isLocked(): boolean {
        return this.locked;
    }

    /** Acquire the lock and call fn. Release the lock when fn returns or throws. */
    public async scopedLock<R>(fn: () => R | Promise<R>): Promise<R> {
        if (this.locked) {
            const { promise, resolve } = makePromise<undefined>();
            this.waiters.push(resolve as () => void);
            // when this resolves, the lock is already ours - the releasing
            // context transferred the ownership to us instead of unlocking
            await promise;
        } else {
            this.locked = true;
        }
        // acquired
        try {
            return await fn();
        } finally {
            const next = this.waiters.shift();
            if (next) {
                // keep `locked` set, so a context locking in-between now
                // and when the waiter is resumed cannot acquire the lock first
                next();
            } else {
                this.locked = false;
            }
        }
    }
}

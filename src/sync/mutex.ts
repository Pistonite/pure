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
 */
// TODO: implement it if needed
// export class Mutex {
//     private waiters: Deque;
//
//     constructor() {
//         this.waiters = new
//     }
//
// }

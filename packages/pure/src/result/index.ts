/**
 * **I once had a fancy error object with TypeScript magic that tries
 * to reduce allocation while maintaining Result-safety. It turns out
 * that was slower than allocating plain objects for every return, because
 * of how V8 optimizes things.**
 *
 * Don't even use `isErr()` helper functions to abstract. They are slower than
 * directly property access in my testing.
 *
 * ## Function that can fail
 * Instead of having functions `throw`, make it `return` instead.
 * ```typescript
 * // Instead of
 * function doSomethingCanFail() {
 *     if (Math.random() < 0.5) {
 *         return 42;
 *     }
 *     throw "oops";
 * }
 * // Do this
 * import type { Result } from "pure/result";
 *
 * function doSomethingCanFail(): Result<number, string> {
 *     if (Math.random() < 0.5) {
 *         return { val: 42 };
 *     }
 *     return { err: "oops" };
 * }
 * ```
 * This is similar to Rust:
 * ```rust
 * fn do_something_can_fail() -> Result<u32, String> {
 *     if ... {
 *         return Ok(42);
 *     }
 *
 *     Err("oops".to_string())
 * }
 * ```
 *
 * ## Calling function that can fail
 * The recommended pattern is
 * ```typescript
 * const x = doTheCall(); // x is Result<T, E>;
 * if (x.err) {
 *     // x.err is E, handle it
 *     return ...
 * }
 * // x.val is T
 * // ...
 * ```
 * If your `E` type covers falsy values that are valid, use `"err" in x` instead of `x.err`.
 * A well-known case is `Result<T, unknown>`. `if(r.err)` cannot narrow the else case to `Ok`,
 * but `if("err" in r)` can.
 *
 * A full example:
 * ```typescript
 * function getParam(name: string): Result<number, Error> {
 *     if (name === "a") {
 *         return { val: 13 };
 *     }
 *     if (name === "b") {
 *         return { val: 42 };
 *     }
 *     return { err: new Error("bad name") };
 * }
 *
 * function multiplyFormat(
 *     name1: string,
 *     name2: string,
 *     prefix: string
 * ): Result<string, Error> {
 *     const v1 = getParam(name1);
 *     if (v1.err) {
 *         console.error(v1.err);
 *         return v1;
 *     }
 *     const v2 = getParam(name1);
 *     if (v2.err) {
 *         console.error(v2.err);
 *         return v2;
 *     }
 *
 *     const formatted = `${prefix}${v1.val * v2.val}`;
 *     return { val: formatted };
 * }
 * ```
 *
 * ## Interop with throwing functions
 * This library also has `tryCatch` to interop with throwing functions,
 * and `tryAsync` for async functions.
 *
 * ```typescript
 * import { tryCatch, tryAsync } from "pure/result";
 *
 * // synchronous
 * const result1: Result<MyData, unknown> = tryCatch(() => JSON.parse<MyData>(...));
 * // or you can specify the error type:
 * const result2 = tryCatch<MyData, SyntaxError>(() => JSON.parse(...));
 *
 * // asynchronous
 * async function doSomethingCanFail() {
 *     if (Math.random() < 0.5) {
 *         return 42;
 *     }
 *     throw "oops";
 * }
 * const result = await tryAsync<number, string>(() => doStuff);
 * ```
 *
 * ## Returning void
 * Use `Void<E>` as the return type if the function returns `void` on success
 * ```typescript
 * const x = doSomethingThatVoidsOnSuccess();
 * if (x.err) {
 *     return x;
 * }
 * // type of x is Record<string, never>, i.e. empty object
 * ```
 *
 * ## Why is there no `match`/`map`/`mapErr`, etc?
 *
 * If you are thinking this is a great idea:
 * ```typescript
 * const result = foo(bar);
 * match(result,
 *     (okValue) => {
 *         // handle ok case
 *     },
 *     (errValue) => {
 *         // handle err case
 *     },
 * );
 * ```
 * The vanilla `if` doesn't allocate the closures, and has less code, and you can
 * control the flow properly inside the blocks with `return`/`break`/`continue`
 * ```typescript
 * const result = foo(bar);
 * if (result.err) {
 *     // handle err case
 * } else {
 *     // handle ok case
 * }
 * ```
 *
 * As for the other utility functions from Rust's Result type, they really only benefit
 * because you can early return with `?` AND those abstractions are zero-cost in Rust.
 * Neither is true in JavaScript.
 *
 * You can also easily write them yourself if you really want to.
 *
 * @module
 */

/**
 * A value that either a success (Ok) or an error (Err)
 *
 * Construct a success with { val: ... } and an error with { err: ... }
 */
export type Result<T, E> = Ok<T> | Err<E>;

// If these look weird, it's because TypeScript is weird
// This is to get type narrowing to work most of the time

/** A success value */
export type Ok<T> = { val: T; err?: never };
/** An error value */
export type Err<E> = { err: E; val?: never };

/**
 * A value that is either `void` or an error
 *
 * Construct success with `{}` and an error with `{ err: ... }`
 */
export type Void<E> = { val?: never; err?: never } | { err: E };
/** A value that is a success `void` */
export type VoidOk = Record<string, never>;

/** Wrap a function with try-catch and return a Result. */
export function tryCatch<T, E = unknown>(fn: () => T): Result<T, E> {
    try {
        return { val: fn() };
    } catch (e) {
        return { err: e as E };
    }
}

/** Wrap an async function with try-catch and return a Promise<Result>. */
export async function tryAsync<T, E = unknown>(
    fn: () => Promise<T>,
): Promise<Result<T, E>> {
    try {
        return { val: await fn() };
    } catch (e) {
        return { err: e as E };
    }
}

/** Try best effort converting an error to a string */
export function errstr(e: unknown, recursing?: boolean): string {
    if (typeof e === "string") {
        return e;
    }
    if (!e) {
        return `${e}`;
    }
    if (typeof e === "object" && "message" in e) {
        if (!recursing) {
            return errstr(e.message, true);
        }
        return `${e.message}`;
    }
    if (typeof e === "object" && "toString" in e) {
        const s = e.toString();
        if (!recursing) {
            return errstr(s, true);
        }
        return `${s}`;
    }
    // try less-likely fields
    if (typeof e === "object" && "msg" in e) {
        if (!recursing) {
            return errstr(e.msg, true);
        }
        return `${e.msg}`;
    }
    if (typeof e === "object" && "code" in e) {
        if (!recursing) {
            return `error code: ${errstr(e.code, true)}`;
        }
        return `${e.code}`;
    }
    return `${e}`;
}

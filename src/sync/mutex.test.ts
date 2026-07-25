import { expect, test } from "mono-dev/vitest";

import { Mutex } from "./mutex.ts";

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

test("example", async () => {
    const mutex = new Mutex();
    let counter = 0;

    const increment = async () => {
        await mutex.scopedLock(async () => {
            const current = counter;
            await wait(10);
            counter = current + 1;
        });
    };

    await Promise.all([increment(), increment(), increment()]);
    expect(counter).toStrictEqual(3);
});

test("returns the value from the closure", async () => {
    const mutex = new Mutex();
    expect(await mutex.scopedLock(async () => 42)).toStrictEqual(42);
    expect(await mutex.scopedLock(() => 43)).toStrictEqual(43);
});

test("only one context in the critical section at a time", async () => {
    const mutex = new Mutex();
    let inside = 0;
    let maxInside = 0;

    const execute = async () => {
        await mutex.scopedLock(async () => {
            inside++;
            maxInside = Math.max(maxInside, inside);
            await wait(1);
            inside--;
        });
    };

    await Promise.all([execute(), execute(), execute(), execute()]);
    expect(maxInside).toStrictEqual(1);
    expect(inside).toStrictEqual(0);
});

test("waiters acquire the lock in FIFO order", async () => {
    const mutex = new Mutex();
    const order: number[] = [];

    const execute = (id: number, ms: number) =>
        mutex.scopedLock(async () => {
            order.push(id);
            await wait(ms);
        });

    // the first one holds the lock while 2, 3 and 4 line up behind it.
    // the wait times are decreasing, to make sure the order does not
    // depend on how long each context holds the lock
    await Promise.all([execute(1, 20), execute(2, 15), execute(3, 10), execute(4, 5)]);
    expect(order).toStrictEqual([1, 2, 3, 4]);
});

import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import { debounce } from "./debounce.ts";

describe("debounce", () => {
    beforeEach(() => {
        vi.useFakeTimers();
    });
    afterEach(() => {
        vi.runAllTimers();
        vi.useRealTimers();
    });
    test("initial call executed immediately", async () => {
        const fn = vi.fn();
        const execute = debounce({
            fn: () => {
                fn();
                return 42;
            },
            interval: 100,
        });
        const result = await execute();
        expect(result).toStrictEqual(42);
        expect(fn).toHaveBeenCalledTimes(1);
    });
    test("debounce call executed after interval", async () => {
        const fn = vi.fn();
        const execute = debounce({
            fn: () => {
                fn();
                return 42;
            },
            interval: 100,
        });
        await execute();
        expect(fn).toHaveBeenCalledTimes(1);
        const promise2 = execute();
        expect(fn).toHaveBeenCalledTimes(1);
        vi.advanceTimersByTime(99);
        expect(fn).toHaveBeenCalledTimes(1);
        vi.advanceTimersByTime(1);
        expect(fn).toHaveBeenCalledTimes(2);
        expect(await promise2).toStrictEqual(42);
    });
    test("discard extra calls", async () => {
        const fn = vi.fn();
        const execute = debounce({
            fn: () => {
                fn();
                return 42;
            },
            interval: 100,
        });
        await execute();
        expect(fn).toHaveBeenCalledTimes(1);
        const promise2 = execute();
        const promise3 = execute();
        expect(fn).toHaveBeenCalledTimes(1);
        vi.advanceTimersByTime(99);
        expect(fn).toHaveBeenCalledTimes(1);
        vi.advanceTimersByTime(1);
        expect(fn).toHaveBeenCalledTimes(2); // not 3
        expect(await promise2).toStrictEqual(42);
        expect(await promise3).toStrictEqual(42);
    });
    test("function takes long to run", async () => {
        const fn = vi.fn();
        const execute = debounce({
            fn: async (i: string) => {
                fn(i);
                await new Promise((resolve) => setTimeout(resolve, 150));
                return i + "out";
            },
            interval: 100,
        });

        const promise1 = execute("");
        expect(fn).toHaveBeenCalledTimes(1);
        const promise2 = execute("2");
        expect(fn).toHaveBeenCalledTimes(1);
        vi.advanceTimersByTime(99);
        expect(fn).toHaveBeenCalledTimes(1);
        vi.advanceTimersByTime(1);
        expect(fn).toHaveBeenCalledTimes(1); // 100 - not called yet
        vi.advanceTimersByTime(149);
        expect(fn).toHaveBeenCalledTimes(1); // 249 - not called yet
        vi.advanceTimersByTime(1);
        // 250 - 1 should be finished
        expect(await promise1).toStrictEqual("out");
        expect(fn).toHaveBeenCalledTimes(2);
        // 2 should be fired now
        vi.advanceTimersByTime(150);
        await promise2;
    });
    test("function takes long to run, disregardExecutionTime", async () => {
        const fn = vi.fn();
        const execute = debounce({
            fn: async (i: string) => {
                fn(i);
                await new Promise((resolve) => setTimeout(resolve, 150));
                return i + "out";
            },
            interval: 100,
            disregardExecutionTime: true,
        });

        // 0 - 1 called
        // 100 - 2 called
        // 150 - 1 finished
        // 250 - 2 finished
        const promise1 = execute("");
        expect(fn).toHaveBeenCalledTimes(1);
        const promise2 = execute("2");
        vi.advanceTimersByTime(99);
        expect(fn).toHaveBeenCalledTimes(1);
        vi.advanceTimersByTime(100);
        expect(fn).toHaveBeenCalledTimes(2);
        vi.advanceTimersByTime(50);
        await promise1;
        vi.advanceTimersByTime(100);
        await promise2;
    });
});

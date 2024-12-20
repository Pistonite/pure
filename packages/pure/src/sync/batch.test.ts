import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import { batch } from "./batch.ts";

describe("batch", () => {
    // sum the inputs
    const batchFn = vi.fn((inputs: [number][]): [number] => {
        const out = inputs.reduce((acc, [x]) => acc + x, 0);
        return [out];
    });
    beforeEach(() => {
        vi.useFakeTimers();
    });
    afterEach(() => {
        vi.runAllTimers();
        vi.useRealTimers();
        batchFn.mockClear();
    });
    test("initial call executed immediately", async () => {
        const fn = vi.fn();
        const execute = batch({
            fn: (x: number) => {
                fn(x);
                return x * 2;
            },
            batch: batchFn,
            interval: 100,
        });

        const result = await execute(1);
        expect(result).toStrictEqual(2);
        expect(fn).toHaveBeenCalledTimes(1);
        expect(batchFn).not.toHaveBeenCalled();
    });
    test("does not batch call executed after interval if only one", async () => {
        const fn = vi.fn();
        const execute = batch({
            fn: (x: number) => {
                fn(x);
                return x * 2;
            },
            batch: batchFn,
            interval: 100,
        });

        const result = await execute(1);
        expect(result).toStrictEqual(2);
        const promise2 = execute(2);
        vi.advanceTimersByTime(99);
        expect(fn).toHaveBeenCalledTimes(1);
        vi.advanceTimersByTime(1);
        expect(fn).toHaveBeenCalledTimes(2);
        expect(await promise2).toStrictEqual(4);

        expect(batchFn).not.toHaveBeenCalled();
    });
    test("batch call executed after interval if more than 1 call", async () => {
        const fn = vi.fn();
        const execute = batch({
            fn: (x: number) => {
                fn(x);
                return x * 2;
            },
            batch: batchFn,
            interval: 100,
        });

        const result = await execute(1);
        expect(result).toStrictEqual(2);
        const promise2 = execute(2);
        const promise3 = execute(3);
        vi.advanceTimersByTime(99);
        expect(fn).toHaveBeenCalledTimes(1);
        vi.advanceTimersByTime(1);
        expect(fn).toHaveBeenCalledTimes(2);
        expect(await promise2).toStrictEqual(10);
        expect(await promise3).toStrictEqual(10);

        expect(batchFn).toHaveBeenCalledTimes(1);
        expect(batchFn.mock.calls[0][0]).toStrictEqual([[2], [3]]);
    });
    test("unbatch", async () => {
        const fn = vi.fn();
        const unbatch = vi.fn(
            (inputs: [number][], output: number): number[] => {
                // not actual meaningful unbatching
                return [output / inputs.length, output / inputs.length];
            },
        );
        const execute = batch({
            fn: (x: number) => {
                fn(x);
                return x * 2;
            },
            batch: batchFn,
            unbatch,
            interval: 100,
        });

        const result = await execute(1);
        expect(result).toStrictEqual(2);
        const promise2 = execute(2);
        const promise3 = execute(3);
        vi.advanceTimersByTime(99);
        expect(fn).toHaveBeenCalledTimes(1);
        vi.advanceTimersByTime(1);
        expect(fn).toHaveBeenCalledTimes(2);
        expect(await promise2).toStrictEqual(5);
        expect(await promise3).toStrictEqual(5);

        expect(batchFn).toHaveBeenCalledTimes(1);
        expect(unbatch).toHaveBeenCalledTimes(1);
        expect(unbatch.mock.calls[0][0]).toStrictEqual([[2], [3]]);
        expect(unbatch.mock.calls[0][1]).toStrictEqual(10);
    });
});

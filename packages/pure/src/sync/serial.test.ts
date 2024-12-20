import { test, expect, expectTypeOf, vi } from "vitest";

import { serial, SerialCancelToken } from "./serial.ts";
import { Result } from "../result/index.ts";

test("example", async () => {
    // helper function to simulate async work
    const wait = (ms: number) =>
        new Promise((resolve) => setTimeout(resolve, ms));
    // Create the wrapped function
    const doWork = serial({
        fn: (checkCancel) => async () => {
            // this takes 1 seconds to complete
            for (let i = 0; i < 10; i++) {
                await wait(1);
                checkCancel();
            }
            return 42;
        },
    });

    // The cancellation mechanism uses the Result type
    // and returns an error when it is cancelled
    const promise1 = doWork();
    await wait(3);
    // calling event.run a second time will cause `shouldCancel` to return false
    // the next time it's called by the first event
    const promise2 = doWork();

    expect(await promise1).toStrictEqual({ err: "cancel" });
    expect(await promise2).toStrictEqual({ val: 42 });
});

test("passing in arguments", async () => {
    const execute = serial({
        fn: (_) => async (arg1: number, arg2: string) => {
            expect(arg1).toStrictEqual(42);
            expect(arg2).toStrictEqual("hello");
        },
    });

    expectTypeOf(execute).toEqualTypeOf<
        (arg1: number, arg2: string) => Promise<Result<void, SerialCancelToken>>
    >();

    await execute(42, "hello"); // no type error!
});

test("current serial number", async () => {
    const execute = serial({
        fn: (_, serial) => () => serial,
    });

    const one = await execute();
    expect(one).toStrictEqual({ val: 1n });
    const two = await execute();
    expect(two).toStrictEqual({ val: 2n });
});
test("no manual cancel check", async () => {
    const execute = serial({
        fn: () => async () => {
            await new Promise((resolve) => setTimeout(resolve, 0));
            return 42;
        },
    });
    const promise1 = execute();
    const promise2 = execute();
    expect(await promise1).toStrictEqual({ err: "cancel" });
    expect(await promise2).toStrictEqual({ val: 42 });
});

test("cancel callback", async () => {
    const onCancel = vi.fn();
    const execute = serial({
        fn: (checkCancel) => async () => {
            await new Promise((resolve) => setTimeout(resolve, 0));
            checkCancel();
            return 42;
        },
        onCancel,
    });
    await Promise.all([execute(), execute()]);
    expect(onCancel).toHaveBeenCalledTimes(1);
});

test("cancel callback, no manual check", async () => {
    const onCancel = vi.fn();
    const execute = serial({
        fn: () => async () => {
            await new Promise((resolve) => setTimeout(resolve, 0));
            return 42;
        },
        onCancel,
    });
    await Promise.all([execute(), execute()]);
    expect(onCancel).toHaveBeenCalledTimes(1);
});

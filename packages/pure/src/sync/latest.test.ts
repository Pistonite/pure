import { expect, test, describe } from "vitest";

import { latest } from "./latest.ts";

describe("latest", () => {
    test("returns latest result", async () => {
        let counter = 0;

        const execute = latest({
            fn: () => {
                return ++counter;
            },
        });

        const result1 = execute();
        const result2 = execute();
        expect(await result1).toStrictEqual(2);
        expect(await result2).toStrictEqual(2);
    });

    test("uses are args equal, args are equal", async () => {
        let counter = 0;

        const execute = latest({
            fn: async (name: string) => {
                ++counter;
                await new Promise((resolve) => setTimeout(resolve, 50));
                return "hello " + name;
            },

            areArgsEqual: ([nameA], [nameB]) => nameA === nameB,
        });

        const result1 = execute("foo");
        const result2 = execute("foo");
        // vi.advanceTimersByTime(50);
        expect(await result1).toStrictEqual("hello foo");
        expect(await result2).toStrictEqual("hello foo");
        // should only be called once
        expect(counter).toEqual(1);
    });

    // this test doesn't pass with fake timers for some reason
    test("uses are args equal, args are not equal", async () => {
        let counter = 0;

        const execute = latest({
            fn: async (name: string) => {
                ++counter;
                await new Promise((resolve) => setTimeout(resolve, 50));
                return "hello " + name;
            },

            areArgsEqual: ([nameA], [nameB]) => nameA === nameB,
        });

        const result1 = execute("foo");
        const result2 = execute("bar");
        // returns latest - both resolved at same time
        expect(await result1).toStrictEqual("hello bar");
        expect(await result2).toStrictEqual("hello bar");
        expect(counter).toEqual(2);
    });
});

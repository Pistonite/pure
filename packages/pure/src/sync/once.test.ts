import { expect, test } from "vitest";

import { once } from "./once.ts";

test("once", async () => {
    let counter = 0;

    const execute = once({
        fn: async () => {
            await new Promise((resolve) => setTimeout(resolve, 100));
            return ++counter;
        },
    });

    const result1 = execute();
    const result2 = execute();
    expect(await result1).toStrictEqual(1);
    expect(await result2).toStrictEqual(1);
});

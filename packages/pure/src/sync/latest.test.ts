import { expect, test } from "vitest";

import { latest } from "./latest.ts";

test("latest", async () => {
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

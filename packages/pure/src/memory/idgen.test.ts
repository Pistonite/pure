import { describe, expect, it } from "vitest";

import { idgen, safeidgen } from "./idgen.ts";

describe("idgen", () => {
    it("idgen generates ids", () => {
        const idgen1 = idgen();
        const idgen2 = idgen();
        expect(idgen1()).toBe(2);
        expect(idgen2()).toBe(2);
        expect(idgen1()).toBe(3);
        expect(idgen2()).toBe(3);
        expect(idgen1()).toBe(4);
        expect(idgen2()).toBe(4);
    });
    it("safeidgen wraps", () => {
        const x = safeidgen(5);
        expect(x()).toBe(2);
        expect(x()).toBe(3);
        expect(x()).toBe(4);
        expect(x()).toBe(1);
        expect(x()).toBe(2);
        expect(x()).toBe(3);
        expect(x()).toBe(4);
    });
});

import { describe, afterEach, expect, it } from "vitest";

import { type Erc, makeErcType } from "./erc.ts";

type Rc = { value: string; refCount: number };
const Marker = Symbol("test");
type Marker = typeof Marker;
class Allocator {
    private mockMemory: (Rc | undefined)[] = [];
    public makeTestErc: (ptr: number) => Erc<Marker>;

    // double indirection means each Erc holds a pointer to the external smart pointer,
    // which also means external smart pointers all need to be heap allocated
    // addRef() will return a pointer to a new external smart pointer
    //
    // single indirection on the other hand, means each Erc holds a pointer
    // to the object directly. and addRef() will return the same pointer
    //
    // The Erc implementation must work with both
    constructor(isDoubleIndirection: boolean) {
        this.makeTestErc = makeErcType({
            marker: Marker,
            free: (ptr: number) => {
                if (ptr < 0 || ptr >= this.mockMemory.length) {
                    throw new Error(
                        `Invalid index into mock memory. Length is ${this.mockMemory.length} but index is ${ptr}`,
                    );
                }

                const rc = this.mockMemory[ptr];
                if (!rc) {
                    throw new Error("Double free detected");
                }

                rc.refCount--;
                if (isDoubleIndirection) {
                    this.mockMemory[ptr] = undefined;
                    return;
                }

                if (rc.refCount === 0) {
                    this.mockMemory[ptr] = undefined;
                }
            },
            addRef: (value: number) => {
                if (value < 0 || value >= this.mockMemory.length) {
                    throw new Error(
                        `Invalid index into mock memory. Length is ${this.mockMemory.length} but index is ${value}`,
                    );
                }

                const rc = this.mockMemory[value];
                if (!rc) {
                    throw new Error("AddRef on freed memory detected");
                }
                rc.refCount++;
                if (isDoubleIndirection) {
                    for (let i = 0; i < this.mockMemory.length; i++) {
                        if (this.mockMemory[i] === undefined) {
                            this.mockMemory[i] = rc;
                            return i;
                        }
                    }
                    this.mockMemory.push(rc);
                    return this.mockMemory.length - 1;
                }

                return value;
            },
        });
    }

    allocValue(value: string): number {
        const rc: Rc = { value, refCount: 1 };
        for (let i = 0; i < this.mockMemory.length; i++) {
            if (this.mockMemory[i] === undefined) {
                this.mockMemory[i] = rc;
                return i;
            }
        }
        this.mockMemory.push(rc);
        return this.mockMemory.length - 1;
    }

    getValue(ptr: number | undefined): string {
        if (ptr === undefined) {
            throw new Error("Dereference of nullptr");
        }
        if (ptr < 0 || ptr >= this.mockMemory.length) {
            throw new Error(
                `Invalid index into mock memory. Length is ${this.mockMemory.length} but index is ${ptr}`,
            );
        }

        const rc = this.mockMemory[ptr];
        if (!rc) {
            throw new Error("Dangling pointer");
        }
        return rc.value;
    }

    expectNoLeak(): void {
        for (let i = 0; i < this.mockMemory.length; i++) {
            const rc = this.mockMemory[i];
            if (rc) {
                throw new Error(
                    `Memory leak detected at index ${i}. Value: ${rc.value}, RefCount: ${rc.refCount}`,
                );
            }
        }
    }

    cleanup(): void {
        this.mockMemory = [];
    }
}

describe.each`
    indirection | allocator
    ${"single"} | ${new Allocator(false)}
    ${"double"} | ${new Allocator(true)}
`(
    "Erc - $indirection indirection",
    ({ allocator }: { allocator: Allocator }) => {
        afterEach(() => {
            allocator.cleanup();
        });

        it("allocate and deallocate correctly", () => {
            const test = allocator.makeTestErc(allocator.allocValue("Hello"));
            expect(allocator.getValue(test.value)).toBe("Hello");
            test.free();
            allocator.expectNoLeak();
        });

        it("frees if assigned new value", () => {
            const test = allocator.makeTestErc(allocator.allocValue("Hello"));
            test.assign(allocator.allocValue("World"));
            expect(allocator.getValue(test.value)).toBe("World");
            test.free();
            allocator.expectNoLeak();
        });

        it("does not free when taking value", () => {
            const test = allocator.makeTestErc(allocator.allocValue("Hello"));
            const raw = test.take();
            expect(allocator.getValue(raw)).toBe("Hello");
            expect(test.value).toBeUndefined();
            if (raw === undefined) {
                throw new Error("Raw value is undefined");
            }
            allocator.makeTestErc(raw).free();
            allocator.expectNoLeak();
        });

        it("invalidates weak references on free", () => {
            const test = allocator.makeTestErc(allocator.allocValue("Hello"));
            const testWeak = test.getWeak();
            expect(allocator.getValue(testWeak.value)).toBe("Hello");
            test.free();
            expect(testWeak.value).toBeUndefined();
            allocator.expectNoLeak();
        });

        it("invalidates weak references on assign", () => {
            const test = allocator.makeTestErc(allocator.allocValue("Hello"));
            const testWeak = test.getWeak();
            expect(allocator.getValue(testWeak.value)).toBe("Hello");
            test.assign(allocator.allocValue("World"));
            expect(testWeak.value).toBeUndefined();
            test.free();
            allocator.expectNoLeak();
        });

        it("handles assign and take of different references correctly", () => {
            const test1 = allocator.makeTestErc(allocator.allocValue("Hello"));
            const test2 = allocator.makeTestErc(allocator.allocValue("World"));
            expect(allocator.getValue(test1.value)).toBe("Hello");
            expect(allocator.getValue(test2.value)).toBe("World");
            test1.assign(test2.take());
            expect(allocator.getValue(test1.value)).toBe("World");
            test1.free();
            allocator.expectNoLeak();
        });

        it("handles assign and take of same references correctly", () => {
            const test1 = allocator.makeTestErc(allocator.allocValue("Hello"));
            const test2 = test1.getStrong();
            test1.assign(test2.take());
            expect(allocator.getValue(test1.value)).toBe("Hello");
            test1.free();
            test2.free(); // should be no-op
            allocator.expectNoLeak();
        });

        it("assigning another Erc directly should cause double free", async () => {
            const test1 = allocator.makeTestErc(allocator.allocValue("Hello"));
            const test2 = test1.getStrong();
            test1.assign(test2.value);
            expect(allocator.getValue(test1.value)).toBe("Hello");
            test1.free();

            const freeTest2 = async () => {
                test2.free();
            };
            await expect(freeTest2).rejects.toThrow("Double free detected");
            allocator.expectNoLeak();
        });

        it("handles assign and take of same references correctly (same Erc)", () => {
            const test1 = allocator.makeTestErc(allocator.allocValue("Hello"));
            test1.assign(test1.take());
            expect(allocator.getValue(test1.value)).toBe("Hello");
            test1.free();
            allocator.expectNoLeak();
        });

        it("assigning another Erc directly should cause double free (same Erc)", async () => {
            const test1 = allocator.makeTestErc(allocator.allocValue("Hello"));
            test1.assign(test1.value);
            const getTest1Value = async () => {
                allocator.getValue(test1.value);
            };
            await expect(getTest1Value).rejects.toThrow("Dangling pointer");

            const freeTest1 = async () => {
                test1.free();
            };
            await expect(freeTest1).rejects.toThrow("Double free detected");
            allocator.expectNoLeak();
        });

        it("inc ref count with strong reference", () => {
            const test = allocator.makeTestErc(allocator.allocValue("Hello"));
            const test2 = test.getStrong();
            expect(allocator.getValue(test.value)).toBe("Hello");
            expect(allocator.getValue(test2.value)).toBe("Hello");
            test.free();
            expect(allocator.getValue(test2.value)).toBe("Hello");
            test2.free();
            allocator.expectNoLeak();
        });

        it("inc ref count with strong reference from weak reference", () => {
            const test = allocator.makeTestErc(allocator.allocValue("Hello"));
            const testWeak = test.getWeak();
            expect(allocator.getValue(testWeak.value)).toBe("Hello");
            const test2 = testWeak.getStrong();
            expect(allocator.getValue(testWeak.value)).toBe("Hello");
            expect(allocator.getValue(test2.value)).toBe("Hello");
            const test2Weak = test2.getWeak();
            test.free();
            expect(testWeak.value).toBeUndefined();
            expect(allocator.getValue(test2.value)).toBe("Hello");
            expect(allocator.getValue(test2Weak.value)).toBe("Hello");
            test2.free();
            expect(test2Weak.value).toBeUndefined();
            allocator.expectNoLeak();
        });
    },
);

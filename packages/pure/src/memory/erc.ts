/**
 * A holder for an externally ref-counted object.
 *
 * See {@link makeErcType} for how to use
 */
export type Erc<TName, TRepr = number> = {
    readonly type: TName;

    /**
     * Underlying object representation.
     *
     * The repr should not be undefinable. undefined means nullptr
     */
    readonly value: TRepr | undefined;

    /**
     * Free the underlying object.
     *
     * All weak references will be invalidated, and this Erc will become
     * empty
     */
    free: () => void;

    /**
     * Assign a new value to this Erc.
     *
     * The old value will be freed, and all weak references will be invalidated.
     */
    assign: (value: TRepr | undefined) => void;

    /**
     * Take the inner value without freeing it.
     *
     * All weak references will be invalidated, and this Erc will become
     * empty
     */
    take: () => TRepr | undefined;

    /**
     * Create a weak reference to the inner value.
     *
     * When this Erc is freed, all weak references will be invalidated.
     */
    getWeak: () => ErcRef<TName, TRepr>;

    /**
     * Create a strong reference to the inner value, essentially
     * incrementing the ref count.
     */
    getStrong: () => Erc<TName, TRepr>;
};

/**
 * Weak reference to an externally ref-counted object.
 *
 * See {@link makeErcType} for how to use
 */
export type ErcRef<TName, TRepr = number> = {
    readonly type: TName;

    /**
     * The underlying object representation.
     *
     * This may become undefined across async calls if the weak reference
     * is invalidated
     */
    readonly value: TRepr | undefined;

    /**
     * Create a strong reference to the inner value, essentially
     * incrementing the ref count.
     */
    getStrong: () => Erc<TName, TRepr>;
};

export type ErcRefType<T> =
    T extends Erc<infer TName, infer TRepr> ? ErcRef<TName, TRepr> : never;

export type ErcTypeConstructor<TName, TRepr> = {
    /**
     * A marker value for the underlying object type.
     *
     * This is commonly a string literal or a symbol.
     */
    marker: TName;

    /**
     * The function to free the underlying object.
     */
    free: (value: TRepr) => void;

    /**
     * Given a value, increase the ref count and return the new reference.
     * The returned representation should be a different value if double indirection
     * is used (each value is a pointer to the smart pointer), or the same value
     * if single indirection is used (the value is pointing to the object itself).
     */
    addRef: (value: TRepr) => TRepr;
};

/**
 * Create a constructor function that serves as the type for an externally ref-counted
 * object type. Erc instances can then be created for manually managing memory for
 * external objects, typically through FFI.
 *
 * Since JS is garbage collected and has no way to enforce certain memory management,
 * the programmer must ensure that Erc instances are handled correctly!!!
 *
 * ## Defining Erc type
 * ```typescript
 * import { makeErcType, type Erc } from "@pistonite/pure/memory";
 *
 * // 2 functions are required to create an Erc type:
 * // free: free the underlying value (essentially decrementing the ref count)
 * // addRef: increment the ref count and return the new reference
 *
 * // here, assume `number` is the JS type used to represent the external object
 * // for example, this can be a pointer to a C++ object
 * declare function freeFoo(obj: number) => void;
 * declare function addRefFoo(obj: number) => number;
 *
 * // assume another function to create (allocate) the object
 * declare function createFoo(): number;
 *
 * // The recommended way is to create a unique symbol for tracking
 * // the external type, you can also use a string literal
 * const Foo = Symbol("Foo");
 * type Foo = typeof Foo;
 *
 * // now, we can create the Erc type
 * const makeFooErc = makeErcType({
 *     marker: Foo,
 *     free: freeFoo,
 *     addRef: addRefFoo,
 * });
 *
 * // and create Erc instances
 * const myFoo: Erc<Foo> = makeFooErc(createFoo());
 * ```
 *
 * ## Using Erc (strong reference)
 * Each `Erc` instance is a strong reference, corresponding to some ref-counted
 * object externally. Therefore, owner of the `Erc` instance should
 * not expose the `Erc` instance to others (for example, returning it from a function),
 * since it will lead to memory leak or double free.
 * ```typescript
 * // create a foo instance externally, and wrap it with Erc
 * const myFoo = makeFooErc(createFoo());
 *
 * // if ownership of myFoo should be returned to external, use `take()`
 * // this will make myFoo empty, and doSomethingWithFooExternally should free it
 * doSomethingWithFooExternally(myFoo.take());
 *
 * // you can also free it directly
 * foo.free();
 * ```
 *
 * ## Using ErcRef (weak reference)
 * Calling `getWeak` on an `Erc` will return a weak reference that has the same
 * inner value. The weak reference is safe to be passed around and copied.
 * ```typescript
 * const myFooWeak = myFoo.getWeak();
 * ```
 *
 * The weak references are tracked by the `Erc` instance.
 * In the example above, when `myFoo` is freed, all weak references created by
 * `getWeak` will be invalidated. If some other code kept the inner value of
 * the weak reference, it will become a dangling pointer.
 *
 * To avoid this, `getStrong` can be used to create a strong reference if
 * the weak reference is still valid, to ensure that the underlying object
 * is never freed while still in use
 * ```typescript
 * const myFooWeak = myFoo.getWeak();
 *
 * // assume we have some async code that needs to use myFoo
 * declare async function doSomethingWithFoo(foo: FooErcRef): Promise<void>;
 *
 * // Below is BAD!
 * await doSomethingWithFoo(myFooWeak);
 * // Reason: doSomethingWithFoo is async, so it's possible that
 * // myFooWeak is invalidated when it's still needed. If the implementation
 * // does not check for that, it could be deferencing a dangling pointer
 * // (of course, it could actually be fine depending on the implementation of doSomethingWithFoo)
 *
 * // Recommendation is to use strong reference for async operations
 * const myFooStrong = myFooWeak.getStrong();
 * await doSomethingWithFoo(myFooStrong.getWeak()); // will never be freed while awaiting
 * // now we free
 * myFooStrong.free();
 *
 * ```
 *
 * ## Assigning to Erc
 * Each `Erc` instance should only ever have one external reference. So you should not
 * assign to an `Erc` variable directly:
 * ```typescript
 * // DO NOT DO THIS
 * let myFoo = makeFooErc(createFoo());
 * myFoo = makeFooErc(createFoo()); // previous Erc is overriden without proper clean up
 * ```
 *
 * If you want to attach a new value to an existing `Erc`, use the `assign` method:
 * ```typescript
 * const myFoo = makeFooErc(createFoo());
 * myFoo.assign(createFoo()); // previous Erc is freed, and the new one is assigned
 * myFoo.free(); // new one is freed
 * ```
 * The example above does not cause leaks, since the previous Erc is freed
 *
 * However, if you call assign with the value of another `Erc`, it will cause memory
 * issues:
 * ```typescript
 * // DO NOT DO THIS
 * const myFoo1 = makeFooErc(createFoo());
 * const myFoo2 = makeFooErc(createFoo());
 * myFoo1.assign(myFoo2.value); // myFoo1 is freed, and myFoo2 is assigned
 * // BAD: now both myFoo1 and myFoo2 references the same object, but the ref count is 1
 * myFoo1.free(); // no issue here, object is freed, but myFoo2 now holds a dangling pointer
 * myFoo2.free(); // double free!
 *
 * // The correct way to do this is to use `take`:
 * const myFoo1 = makeFooErc(createFoo());
 * const myFoo2 = makeFooErc(createFoo());
 * myFoo1.assign(myFoo2.take()); // myFoo1 is freed, and myFoo2 is assigned, myFoo2 is empty
 * myFoo1.free(); // no issue here, object is freed
 * // myFoo2 is empty, so calling free() has no effect
 * ```
 *
 * Assign also works if both `Erc` are 2 references of the same object:
 * ```typescript
 * const myFoo1 = makeFooErc(createFoo()); // ref count is 1
 * const myFoo2 = myFoo1.getStrong(); // ref count is 2
 * myFoo1.assign(myFoo2.take()); // frees old value, ref count is 1
 *
 * // This also works:
 * const myFoo1 = makeFooErc(createFoo()); // ref count is 1
 * myFoo1.assign(myFoo1.take()); // take() makes myFoo1 empty, so assign() doesn't free it
 *
 * // DO NOT DO THIS:
 * myFoo1.assign(myFoo1.value); // this will free the value since ref count is 0, and result in a dangling pointer
 * ```
 *
 */
export const makeErcType = <TName, TRepr>({
    marker,
    free,
    addRef,
}: ErcTypeConstructor<TName, TRepr>): ((
    value: TRepr | undefined,
) => Erc<TName, TRepr>) => {
    const createStrongRef = (value: TRepr | undefined): Erc<TName, TRepr> => {
        let weakRef:
            | (ErcRef<TName, TRepr> & { invalidate: () => void })
            | undefined = undefined;
        const invalidateWeakRef = () => {
            if (!weakRef) {
                return;
            }
            const oldWeakRef = weakRef;
            weakRef = undefined;
            oldWeakRef.invalidate();
        };
        const createWeakRef = (initialValue: TRepr | undefined) => {
            const weak = {
                type: marker,
                value: initialValue,
                invalidate: () => {
                    weak.value = undefined;
                },
                getStrong: () => {
                    if (weak.value === undefined) {
                        return createStrongRef(undefined);
                    }
                    return createStrongRef(addRef(weak.value));
                },
            };
            return weak;
        };
        const erc = {
            type: marker,
            value,
            free: () => {
                if (erc.value !== undefined) {
                    invalidateWeakRef();
                    free(erc.value);
                    erc.value = undefined;
                }
            },
            assign: (newValue: TRepr | undefined) => {
                erc.free();
                erc.value = newValue;
            },
            take: () => {
                invalidateWeakRef();
                const oldValue = erc.value;
                erc.value = undefined;
                return oldValue;
            },
            getWeak: () => {
                if (!weakRef) {
                    weakRef = createWeakRef(erc.value);
                }
                return weakRef;
            },
            getStrong: () => {
                if (erc.value === undefined) {
                    return createStrongRef(undefined);
                }
                return createStrongRef(addRef(erc.value));
            },
        };
        return erc;
    };
    return createStrongRef;
};

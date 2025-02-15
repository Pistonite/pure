export type ExternalWeakRef<TUnderlying, TType> = {
    /**
     * A marker value for the underlying object type.
     *
     * This is commonly a string literal or a symbol.
     */
    type: TType;

    /**
     * The underlying object reference.
     */
    ref: TUnderlying | undefined;

    /**
     * Free the underlying object.
     */
    free: () => void;

    /**
     * Update the underlying object reference.
     *
     * If the new reference is the same as the old one, nothing will happen.
     * If the old reference is not undefined, it will be freed.
     */
    set: (value: TUnderlying | undefined) => void;
};

export type ExternalWeakRefConstructor<TUnderlying, TType> = {
    /**
     * A marker value for the underlying object type.
     *
     * This is commonly a string literal or a symbol.
     */
    marker: TType;

    /**
     * The function to free the underlying object.
     */
    free: (obj: TUnderlying) => void;
};

/**
 * Create a weak reference type for managing externally memory-managed object. This means
 * the objects needs to be freed manually by the external code.
 *
 * The `marker` option is used to distinguish between different types of weak references
 * with the same underlying representation for the reference.
 *
 * Note that the underlying representation should not be undefined-able!
 *
 * ## Example
 * ```typescript
 * import { makeExternalWeakRefType } from "@pistonite/pure/memory";
 *
 * // assume `number` is the JS type used to represent the external object
 * // for example, this can be a pointer to a C++ object
 * declare function freeFoo(obj: number) => void;
 *
 * // some function that allocates a foo object externally and returns
 * // a reference
 * declare function getFoo(): number;
 *
 * const makeFooRef = makeExternalWeakRefType({
 *     marker: "foo",
 *     free: (obj) => {
 *         freeFoo(obj);
 *     }
 * });
 * type FooRef = ReturnType<typeof makeFooRef>;
 *
 * // create a reference to a foo object
 * // now this reference can be passed around in JS,
 * // as long as the ownership model is clear and the owner
 * // remembers to free it
 * const fooRef = makeFooRef(getFoo());
 *
 * // free the foo object when it is no longer needed
 * fooRef.free();
 *
 * ## Updating the reference
 * The `set` method will update the reference and free the old one if exists
 * ```
 * const fooRef = makeFooRef(getFoo());
 * fooRef.set(getFoo()); // the old one will be freed, unless it is the same as the new one
 * ```
 *
 * This has a major pitfall: If the ExternalWeakRef is shared, the new object will be accessible
 * by code that has the old reference. In other words, when the reference is updated, code that
 * already has the old reference will not able to know that it has changed.
 *
 * If this is a problem, you should use this pattern instead:
 * ```typescript
 * // track the "current" valid reference
 * let currentRef = makeFooRef(undefined);
 *
 * export const getFooRef = (): FooRef => {
 *     // because of this function, many other places can hold
 *     // a valid reference to foo
 *     return currentRef;
 * }
 *
 * export const updateFooRef = (newFoo: number): void => {
 *     // when updating the reference, we create a new weak ref and free the old one
 *     if (currentRef.ref === newFoo) {
 *         return; // always need to check if old and new are the same, otherwise we will be freeing the new one
 *     }
 *     const newRef = makeFooRef(newFoo);
 *     currentRef.free();
 *     currentRef = newRef;
 *
 *     // now other places that hold the old reference will see it's freed
 * }
 * ```
 */
export const makeExternalWeakRefType = <TUnderlying, TType>({
    marker,
    free,
}: ExternalWeakRefConstructor<TUnderlying, TType>) => {
    return (
        obj: TUnderlying | undefined,
    ): ExternalWeakRef<TUnderlying, TType> => {
        const weakRefObj = {
            type: marker,
            ref: obj,
            free: () => {
                if (weakRefObj.ref !== undefined) {
                    free(weakRefObj.ref);
                }
            },
            set: (value: TUnderlying | undefined) => {
                if (weakRefObj.ref !== undefined && weakRefObj.ref !== value) {
                    free(weakRefObj.ref);
                }
                weakRefObj.ref = value;
            },
        };
        return weakRefObj;
    };
};

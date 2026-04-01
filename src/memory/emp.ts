/**
 * A non-null, **E**ngine-**m**anaged **P**ointer
 *
 * This uses the ECMA FinalizationRegistry, to free the resource,
 * once this object is garbage-collected.
 *
 * The free function may be async.
 *
 * ## Use case
 * When JS interoperates with a system language like C/C++ or Rust,
 * it is often needed to transfer objects into JS context. If the object
 * is big, copy-transfer could be expensive, so the more ideal solution
 * is to transfer a "handle", or a pointer, to JS, and leaving the actual
 * object in the native memory. Then, JS code and pass the pointer to external
 * code to use or extract data from the object when needed.
 *
 * This approach is just like passing raw pointers in C, which means it is
 * extremely succeptible to memory corruption bugs like double-free or
 * use-after-free. Unlike C++ or Rust, JS also doesn't have destructors
 * that run when an object leaves the scope (proposal for the `using` keyword exists,
 * but you can actually double-free the object with `using`).
 *
 * C-style manual memory management might be sufficient for simple bindings,
 * but for more complex scenarios, automatic memory management is needed,
 * by tying the free call to the GC of a JS object.
 *
 * ## Recommended practice
 * 1. The external code should transfer the ownership of the object
 *    to JS when passing it to JS. JS will then put the handle into an Emp
 *    to be automatically managed. This means the external code should now
 *    never free the object, and let JS free it instead.
 * 2. The inner value of the Emp must only be used for calling
 *    external code, and the Emp must be kept alive for all runtimes, including
 *    those with heavy optimization that may reclaim the Emp during the call,
 *    if it's not referenced afterwards. See {@link scopedCapture}.
 *    The inner value must not dangle around outside of the Emp that owns it.
 *
 * ## Pointer Size
 * In 32-bit context like WASM32, the inner value can be a `number`.
 * In 64-bit context, `number` might be fine for some systems, but `bigint`
 * is recommended.
 */
export type Emp<T, TRepr> = {
    /** The type marker for T. This only marks the type for TypeScript and does not exist at runtime */
    readonly __phantom: T;
    /** The underlying pointer value */
    readonly value: TRepr;
};

export type EmpConstructor<T, TRepr> = {
    /**
     * The marker for the Emp type, used to distinguish between multiple types
     *
     * Typically, this is a unique symbol:
     * ```typescript
     * const MyNativeType = Symbol("MyNativeType");
     * export type MyNativeType = typeof MyNativeType;
     *
     * const makeMyNativeTypeEmp = makeEmpType({
     *     marker: MyNativeType,
     *     free: (ptr) => void freeMyNativeType(ptr)
     * })
     * ```
     *
     * Note that this is not used in runtime, but just used for type inference,
     * so you can also skip passing it and specify the type parameter instead
     */
    marker?: T;

    /**
     * Function to free the underlying object. Called when this Emp is garbage-collected
     */
    free: (ptr: TRepr) => void | Promise<void>;
};

/**
 * Create a factory function for an {@link Emp} type.
 */
export const makeEmpType = <T, TRepr>({
    free,
}: EmpConstructor<T, TRepr>): ((ptr: TRepr) => Emp<T, TRepr>) => {
    const registry = new FinalizationRegistry(free);
    return (ptr: TRepr) => {
        const obj = Object.freeze({ value: ptr });
        registry.register(obj, ptr);
        return obj as Emp<T, TRepr>;
    };
};

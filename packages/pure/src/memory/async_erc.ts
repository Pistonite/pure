/**
 * A holder for an externally ref-counted object, where free and addref
 * operations are asynchronous.
 *
 * See {@link makeErcType} for how to use
 *
 * @deprecated use Emp
 */
export type AsyncErc<TName, TRepr = number> = {
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
     * All weak references will be immediately invalidated, and this Erc becomes
     * empty. Awaiting on the promise will ensure that the object is freed externally
     */
    free: () => Promise<void>;

    /**
     * Assign a new value to this Erc.
     *
     * The old value will be freed, and all weak references will be invalidated.
     */
    assign: (value: TRepr | undefined) => Promise<void>;

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
    getWeak: () => AsyncErcRef<TName, TRepr>;

    /**
     * Create a strong reference to the inner value, essentially
     * incrementing the ref count.
     */
    getStrong: () => Promise<AsyncErc<TName, TRepr>>;
};

/**
 * Weak reference to an externally ref-counted object.
 *
 * See {@link makeErcType} for how to use
 *
 * @deprecated use Emp
 */
export type AsyncErcRef<TName, TRepr = number> = {
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
    getStrong: () => Promise<AsyncErc<TName, TRepr>>;
};

/**
 * @deprecated use Emp
 */
export type AsyncErcRefType<T> =
    T extends AsyncErc<infer TName, infer TRepr> ? AsyncErcRef<TName, TRepr> : never;

/**
 * @deprecated use Emp
 */
export type AsyncErcTypeConstructor<TName, TRepr> = {
    /**
     * A marker value for the underlying object type.
     *
     * This is commonly a string literal or a symbol.
     */
    marker: TName;

    /**
     * The function to free the underlying object.
     */
    free: (value: TRepr) => Promise<void> | void;

    /**
     * Given a value, increase the ref count and return the new reference.
     * The returned representation should be a different value if double indirection
     * is used (each value is a pointer to the smart pointer), or the same value
     * if single indirection is used (the value is pointing to the object itself).
     */
    addRef: (value: TRepr) => Promise<TRepr> | TRepr;
};

/**
 * @deprecated use Emp
 */
export const makeAsyncErcType = <TName, TRepr>({
    marker,
    free,
    addRef,
}: AsyncErcTypeConstructor<TName, TRepr>): ((
    value: TRepr | undefined,
) => AsyncErc<TName, TRepr>) => {
    const createStrongRef = (value: TRepr | undefined): AsyncErc<TName, TRepr> => {
        let weakRef: (AsyncErcRef<TName, TRepr> & { invalidate: () => void }) | undefined =
            undefined;
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
                getStrong: async () => {
                    if (weak.value === undefined) {
                        return createStrongRef(undefined);
                    }
                    return createStrongRef(await addRef(weak.value));
                },
            };
            return weak;
        };
        const erc = {
            type: marker,
            value,
            free: async () => {
                if (erc.value !== undefined) {
                    invalidateWeakRef();
                    const freePromise = free(erc.value);
                    erc.value = undefined;
                    await freePromise;
                }
            },
            assign: async (newValue: TRepr | undefined) => {
                await erc.free();
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
            getStrong: async () => {
                if (erc.value === undefined) {
                    return createStrongRef(undefined);
                }
                return createStrongRef(await addRef(erc.value));
            },
        };
        return erc;
    };
    return createStrongRef;
};

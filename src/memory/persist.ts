import { cell, type Cell, type CellConstructor } from "./cell.ts";

/**
 * Create a cell that persists its value to a web storage
 */
export function persist<T>(args: PersistConstructor<T>): Persist<T> {
    const { storage, key, serialize = JSON.stringify, deserialize, initial } = args;
    const deser =
        deserialize ??
        ((value: string) => {
            try {
                return JSON.parse(value);
            } catch {
                return null;
            }
        });
    return new PersistImpl(storage, key, serialize, deser, initial);
}

/** Args for creating a persisted cell */
export interface PersistConstructor<T> extends CellConstructor<T> {
    /** The web storage to use */
    storage: PersistStorage;

    /** The key to use in the storage */
    key: string;

    /**
     * Serialize the value to store in the storage
     *
     * By default, it will use `JSON.stringify`
     */
    serialize?(value: T): string;
    /**
     * Deserialize the value from the storage
     *
     * By default, it will use `JSON.parse` wrapped with try-catch
     */
    deserialize?(value: string): T | null;
}

/** A cell that also persists its value */
export interface Persist<T> extends Cell<T> {
    /**
     * Load the value initially, and notify all the current subscribers
     *
     * Optionally, you can pass an initial value to override the current value
     */
    init(initial?: T): T;
    /** Clear the value from the storage */
    clear(): void;
    /** Clear the value and disable the persistence */
    disable(): void;
}

class PersistImpl<T> implements Persist<T> {
    private cell: Cell<T>;
    private unsubscribe: () => void;

    constructor(
        private storage: PersistStorage,
        private key: string,
        private serialize: (value: T) => string,
        private deserialize: (value: string) => T | null,
        initial: T,
    ) {
        this.cell = cell({ initial });
        this.unsubscribe = () => {};
    }

    public init(initial?: T): T {
        const serialize = this.serialize;
        const deserialize = this.deserialize;
        let value: T;
        if (initial !== undefined) {
            value = initial;
        } else {
            value = this.cell.get();
        }
        try {
            const data = this.storage.getItem(this.key);
            if (data !== null) {
                const loadedValue = deserialize(data);
                if (loadedValue !== null) {
                    value = loadedValue;
                }
            }
        } catch {
            /* ignore */
        }
        this.cell.set(value);
        this.unsubscribe = this.cell.subscribe((value) => {
            this.storage.setItem(this.key, serialize(value));
        });
        return value;
    }

    public get(): T {
        return this.cell.get();
    }

    public set(value: T): void {
        this.cell.set(value);
    }

    public subscribe(callback: (value: T) => void, notifyImmediately?: boolean): () => void {
        return this.cell.subscribe(callback, notifyImmediately);
    }

    public clear() {
        this.storage.removeItem(this.key);
    }

    public disable() {
        this.clear();
        this.unsubscribe();
    }
}

/**
 * Interface for Web Storage API used by `persist`.
 *
 * This is here so projects without DOM types can use `persist`
 */
export interface PersistStorage {
    getItem(key: string): string | null;
    setItem(key: string, value: string): void;
    removeItem(key: string): void;
}

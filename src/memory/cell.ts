/**
 * A light weight storage wrapper around a value
 * that can be subscribed to for changes
 *
 * ```typescript
 * import { cell } from "@pistonite/pure/memory";
 *
 * // type: Cell<boolean>
 * const myCell = cell({ initial: true });
 * ```
 *
 * See {@link Cell}
 */
export const cell = <T>(args: CellConstructor<T>): Cell<T> => {
    return new CellImpl(args.initial);
};

/** Args for constructing a {@link cell} */
export interface CellConstructor<T> {
    /** Initial value */
    initial: T;
}

/** See {@link cell} */
export interface Cell<T> {
    /** Get the current value */
    get(): T;
    /** Set the value and triggers subscribers if the new value is not the same reference (compared with `===`)*/
    set(value: T): void;
    /** Add a subscriber. Returns a function to unsubscribe */
    subscribe(callback: (value: T) => void, notifyImmediately?: boolean): () => void;
}

class CellImpl<T> implements Cell<T> {
    private subscribers: ((value: T) => void)[] = [];

    constructor(private value: T) {}

    public get(): T {
        return this.value;
    }

    public set(value: T): void {
        if (this.value === value) {
            return;
        }
        this.value = value;
        const len = this.subscribers.length;
        for (let i = 0; i < len; i++) {
            const callback = this.subscribers[i];
            callback(value);
        }
    }

    public subscribe(callback: (value: T) => void, notifyImmediately?: boolean): () => void {
        this.subscribers.push(callback);
        const unsubscribe = () => {
            const index = this.subscribers.indexOf(callback);
            if (index >= 0) {
                this.subscribers.splice(index, 1);
            }
        };
        if (notifyImmediately) {
            callback(this.value);
        }
        return unsubscribe;
    }
}

/**
 * Create a light weight storage wrapper around a value
 * that can be subscribed to for changes
 */
export function cell<T>({ initial }: CellConstructor<T>): Cell<T> {
    return new CellImpl(initial);
}

export type CellConstructor<T> = {
    /** Initial value */
    initial: T;
};

export type Cell<T> = {
    get(): T;
    set(value: T): void;
    subscribe(callback: (value: T) => void, notifyImmediately?: boolean): () => void;
};

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

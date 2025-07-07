import {
    type AnyFn,
    makePromise,
    type PromiseHandle,
    type AwaitRet,
} from "./util.ts";

/**
 * An async event wrapper that allows multiple calls in an interval
 * to be batched together, and only call the underlying function once.
 *
 * Optionally, the output can be unbatched to match the inputs.
 *
 * ## Example
 * The API is a lot like `debounce`, but with an additional `batch` function
 * and an optional `unbatch` function.
 * ```typescript
 * import { batch } from "@pistonite/pure/sync";
 *
 * const execute = batch({
 *     fn: (n: number) => {
 *         console.log(n);
 *     },
 *     interval: 100,
 *     // batch receives all the inputs and returns a single input
 *     // here we just sums the inputs
 *     batch: (args: [number][]): [number] => [args.reduce((acc, [n]) => acc + n, 0)],
 * });
 *
 * await execute(1); // logs 1 immediately
 * const p1 = execute(2); // will be resolved at 100ms
 * const p2 = execute(3); // will be resolved at 100ms
 * await Promise.all([p1, p2]); // logs 5 after 100ms
 * ```
 *
 * ## Unbatching
 * The optional `unbatch` function allows the output to be unbatched,
 * so the promises are resolved as if the underlying function is called
 * directly.
 *
 * Note that unbatching is usually slow and not required.
 *
 * ```typescript
 * import { batch } from "@pistonite/pure/sync";
 *
 * type Message = {
 *     id: number;
 *     payload: string;
 * }
 *
 * const execute = batch({
 *     fn: (messages: Message[]): Message[] => {
 *         console.log(messages.length);
 *         return messages.map((m) => ({
 *             id: m.id,
 *             payload: m.payload + "out",
 *         }));
 *     },
 *     batch: (args: [Message[]][]): [Message[]] => {
 *         const out: Message[] = [];
 *         for (const [messages] of args) {
 *             out.push(...messages);
 *         }
 *         return [out];
 *     },
 *     unbatch: (inputs: [Message[]][], output: Message[]): Message[][] => {
 *         // not efficient, but just for demonstration
 *         const idToOutput = new Map();
 *         for (const o of output) {
 *             idToOutput.set(o.id, o);
 *         }
 *         return inputs.map(([messages]) => {
 *             return messages.map(({id}) => {
 *                 return idToOutput.get(m.id)!;
 *             });
 *         });
 *     },
 *     interval: 100,
 * });
 *
 * const r1 = await execute([{id: 1, payload: "a"}]); // logs 1 immediately
 * // r1 is [ {id: 1, payload: "aout"} ]
 *
 * const p1 = execute([{id: 2, payload: "b"}]); // will be resolved at 100ms
 * const p2 = execute([{id: 3, payload: "c"}]); // will be resolved at 100ms
 *
 * const r2 = await p2; // 2 is logged
 * // r1 is [ {id: 2, payload: "bout"} ]
 * const r3 = await p3; // nothing is logged, as it's already resolved
 * // r2 is [ {id: 3, payload: "cout"} ]
 *
 * ```
 *
 */
export function batch<TFn extends AnyFn>({
    fn,
    batch,
    unbatch,
    interval,
    disregardExecutionTime,
}: BatchConstructor<TFn>) {
    const impl = new BatchImpl(
        fn,
        batch,
        unbatch,
        interval,
        !!disregardExecutionTime,
    );
    return (...args: Parameters<TFn>) => impl.invoke(...args);
}

/**
 * Options to construct a  `batch` function
 */
export type BatchConstructor<TFn extends AnyFn> = {
    /** Function to be wrapped */
    fn: TFn;
    /** Function to batch the inputs across multiple calls */
    batch: (args: Parameters<TFn>[]) => Parameters<TFn>;

    /**
     * If provided, unbatch the output according to the inputs,
     * so each call receives its own output.
     *
     * By default, each input will receive the same output from the batched call
     */
    unbatch?: (
        inputs: Parameters<TFn>[],
        output: AwaitRet<TFn>,
    ) => AwaitRet<TFn>[];

    /**
     * Interval between each batched call
     */
    interval: number;

    /** See `debounce` for more information */
    disregardExecutionTime?: boolean;
};

class BatchImpl<TFn extends AnyFn> {
    private idle: boolean;
    private scheduled: (PromiseHandle<AwaitRet<TFn>> & {
        input: Parameters<TFn>;
    })[];

    constructor(
        private fn: TFn,
        private batch: (inputs: Parameters<TFn>[]) => Parameters<TFn>,
        private unbatch:
            | ((
                  input: Parameters<TFn>[],
                  output: AwaitRet<TFn>,
              ) => AwaitRet<TFn>[])
            | undefined,
        private interval: number,
        private disregardExecutionTime: boolean,
    ) {
        this.idle = true;
        this.scheduled = [];
    }

    public invoke(...args: Parameters<TFn>): Promise<AwaitRet<TFn>> {
        if (this.idle) {
            this.idle = false;
            return this.execute(...args);
        }
        const { promise, resolve, reject } = makePromise<AwaitRet<TFn>>();
        this.scheduled.push({
            input: args,
            promise,
            resolve,
            reject,
        });

        return promise;
    }

    private async scheduleNext() {
        const next = this.scheduled;
        if (next.length) {
            this.scheduled = [];
            const batch = this.batch;
            const inputs = next.map(({ input }) => input);
            const input = next.length > 1 ? batch(inputs) : inputs[0];
            try {
                const output = await this.execute(...input);
                const unbatch = this.unbatch;
                if (unbatch && inputs.length > 1) {
                    const outputs = unbatch(inputs, output);
                    for (let i = 0; i < next.length; i++) {
                        const { resolve } = next[i];
                        resolve(outputs[i]);
                    }
                } else {
                    for (let i = 0; i < next.length; i++) {
                        const { resolve } = next[i];
                        resolve(output);
                    }
                }
            } catch (e) {
                for (let i = 0; i < next.length; i++) {
                    const { reject } = next[i];
                    reject(e);
                }
            }
            return;
        }
        this.idle = true;
    }

    private async execute(...args: Parameters<TFn>): Promise<AwaitRet<TFn>> {
        const fn = this.fn;
        let done = this.disregardExecutionTime;
        setTimeout(() => {
            if (done) {
                void this.scheduleNext();
            } else {
                done = true;
            }
        }, this.interval);
        try {
            return await fn(...args);
        } finally {
            if (!this.disregardExecutionTime) {
                if (done) {
                    // interval already passed, we need to call it
                    void this.scheduleNext();
                } else {
                    done = true;
                }
            }
        }
    }
}

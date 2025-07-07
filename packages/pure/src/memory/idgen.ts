/**
 * Return an id generator that will generate ids in order
 * from 1 to n, wrapping around to 1 when it's n
 */
export const safeidgen = (n: number): (() => number) => {
    let x = 1;
    return () => {
        x += 1;
        if (x === n) {
            x = 1;
        }
        return x;
    };
};

/**
 * Return an id generator that returns bigint,
 * starting from 1n, and will always return a new bigint
 */
export const bidgen = (): (() => bigint) => {
    let x = 1n;
    return () => {
        x += 1n;
        return x;
    };
};

/**
 * Returns an id generator that returns number staring from 1
 * and always increasing. The number could become inaccurate
 * (not integer) when exceeding Number.MAX_SAFE_INTEGER (which
 * is 2^53 - 1
 */
export const idgen = (): (() => number) => {
    let x = 1;
    return () => {
        x += 1;
        return x;
    };
};

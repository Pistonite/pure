/**
 * # pure/pref/dark
 * Dark mode wrappers
 *
 * ## Detect user preference
 * User preference is detected with `matchMedia` API, if available.
 * ```typescript
 * import { prefersDarkMode } from "@pistonite/pure/dark";
 *
 * console.log(prefersDarkMode());
 * ```
 *
 * ## Global dark mode state
 * `initDark` initializes the dark mode state.
 * ```typescript
 * import { initDark, isDark, setDark, addDarkSubscriber } from "@pistonite/pure/dark";
 *
 * initDark();
 * console.log(isDark());
 *
 * addDarkSubscriber((dark) => { console.log("Dark mode changed: ", dark); });
 * setDark(true); // will trigger the subscriber
 * ```
 *
 * ## Use with React
 * This library does not depend on React, so you need to create the hook with `createUseDark`.
 * ```tsx
 * import { useState, useEffect } from "react";
 * import { createUseDark } from "@pistonite/pure/dark";
 *
 * const useDark = createUseDark(useState, useEffect);
 *
 * const MyComponent = () => {
 *    // will re-render when dark mode changes
 *    const dark = useDark();
 *
 *    return <div>{dark ? "Mode: Dark" : "Mode: Light"}</div>;
 * };
 * ```
 *
 * ## Persisting to localStorage
 * You can persist the dark mode preference to by passing `persist: true` to `initDark`.
 * This will make `initDark` also load the preference from localStorage.
 * ```typescript
 * import { initDark } from "@pistonite/pure/dark";
 *
 * initDark({ persist: true });
 * ```
 *
 * ## Setting `color-scheme` CSS property
 * The `color-scheme` property handles dark mode for native components like buttons
 * and scrollbars. By default, `initDark` will handle setting this property for the `:root` selector.
 * You can override this by passing a `selector` option.
 * ```typescript
 * import { initDark } from "@pistonite/pure/dark";
 *
 * // will set `.my-app { color-scheme: dark }`
 * initDark({ selector: ".my-app" });
 * ```
 *
 * @module
 */

import { injectStyle } from "./injectStyle.ts";

const KEY = "Pure.Dark";

let dark = false;
const subscribers: ((dark: boolean) => void)[] = [];

/**
 * Returns if dark mode is prefered in the browser environment
 *
 * If `window.matchMedia` is not available, it will return `false`
 */
export const prefersDarkMode = (): boolean => {
    return !!globalThis.matchMedia?.("(prefers-color-scheme: dark)").matches;
};

/** Value for the `color-scheme` CSS property */
export type ColorScheme = "light" | "dark";
/** Option for initializing dark mode */
export type DarkOptions = {
    /**
     * Initial value for dark mode
     *
     * If not set, it will default to calling `prefersDarkMode()`.
     *
     * If `persist` is `true`, it will also check the value from localStorage
     */
    initial?: boolean;
    /** Persist the dark mode preference to localStorage */
    persist?: boolean;
    /**
     * The selector to set `color-scheme` property
     *
     * Defaults to `:root`. If set to empty string, CSS will not be updated
     */
    selector?: string;
};

/**
 * Initializes dark mode
 *
 * @param options Options for initializing dark mode
 */
export const initDark = (options: DarkOptions = {}): void => {
    let _dark = options.initial || prefersDarkMode();

    if (options.persist) {
        const value = localStorage.getItem(KEY);
        if (value !== null) {
            _dark = !!value;
        }
        addDarkSubscriber((dark: boolean) => {
            localStorage.setItem(KEY, dark ? "1" : "");
        });
    } else {
        localStorage.removeItem(KEY);
    }

    const selector = options.selector ?? ":root";
    if (selector) {
        addDarkSubscriber((dark: boolean) => {
            updateStyle(dark, selector);
        });
    }

    setDark(_dark);
};

/**
 * Gets the current value of dark mode
 */
export const isDark = (): boolean => dark;

/**
 * Set the value of dark mode
 */
export const setDark = (value: boolean): void => {
    if (dark === value) {
        return;
    }
    dark = value;
    const len = subscribers.length;
    for (let i = 0; i < len; i++) {
        subscribers[i](dark);
    }
};
/**
 * Add a subscriber to dark mode changes
 *
 * If `notifyImmediately` is `true`, the subscriber will be called immediately with the current value
 */
export const addDarkSubscriber = (
    subscriber: (dark: boolean) => void,
    notifyImmediately?: boolean,
): void => {
    subscribers.push(subscriber);
    if (notifyImmediately) {
        subscriber(dark);
    }
};

/**
 * Remove a subscriber from dark mode changes
 */
export const removeDarkSubscriber = (
    subscriber: (dark: boolean) => void,
): void => {
    const index = subscribers.indexOf(subscriber);
    if (index >= 0) {
        subscribers.splice(index, 1);
    }
};

/**
 * Create a useDark hook for React.
 *
 * This library does not depend on React, so you need to
 * create the hook yourself and pass in `useState` and `useEffect`.
 *
 * # Example
 * ```tsx
 * import { useState, useEffect } from "react";
 * import { createUseDark } from "@pistonite/pure/dark";
 * const useDark = createUseDark(useState, useEffect);
 * ```
 */
export const createUseDark = (
    useState: (initial: boolean) => [boolean, (value: boolean) => void],
    useEffect: (callback: () => void, dep: any[]) => void,
): (() => boolean) => {
    return () => {
        const [value, setValue] = useState(dark);
        useEffect(() => {
            if (dark !== value) {
                setValue(dark);
            }
            const subscriber = (dark: boolean) => {
                setValue(dark);
            };
            addDarkSubscriber(subscriber);
            return () => {
                removeDarkSubscriber(subscriber);
            };
        }, []);
        return value;
    };
};

const updateStyle = (dark: boolean, selector: string) => {
    const text = `${selector} { color-scheme: ${dark ? "dark" : "light"}; }`;
    injectStyle(KEY, text);
};

/**
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
 * A React hook is provided in the [`pure-react`](https://jsr.io/@pistonite/pure-react/doc/pref) package
 * to get the dark mode state from React components.
 *
 * Use `setDark` to change the dark mode state from React compoenents like you would from anywhere else.
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

    setDark(_dark);

    const selector = options.selector ?? ":root";
    if (selector) {
        // notify immediately to update the style initially
        addDarkSubscriber((dark: boolean) => {
            updateStyle(dark, selector);
        }, true /* notify */);
    }
};

/**
 * Clears the persisted dark mode preference
 *
 * If you are doing this, you should probably call `setDark`
 * with `prefersDarkMode()` or some initial value immediately before this,
 * so the current dark mode is set to user's preferred mode.
 *
 * Note if `persist` is `true` when initializing,
 * subsequence `setDark` calls will still persist the value.
 */
export const clearPersistedDarkPerference = (): void => {
    localStorage.removeItem(KEY);
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

const updateStyle = (dark: boolean, selector: string) => {
    const text = `${selector} { color-scheme: ${dark ? "dark" : "light"}; }`;
    injectStyle(KEY, text);
};
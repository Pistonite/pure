/**
 * # pure-react/pref
 *
 * React bindings for `pure/pref`
 *
 * ## Dark Mode
 * The `useDark` hook returns the current dark mode state, and subscribes to changes.
 * To set the dark mode, use `setDark` from `pure/pref`.
 * ```tsx
 * import { useDark } from "@pistonite/pure-react";
 *
 * const MyComponent = () => {
 *    // will re-render when dark mode changes
 *    const dark = useDark();
 *
 *    return <div>{dark ? "Mode: Dark" : "Mode: Light"}</div>;
 * };
 * ```
 *
 * ## Locale
 * The `useLocale` hook returns the current locale, and subscribes to changes.
 *
 * ```tsx
 * import { useLocale } from "@pistonite/pure-react";
 *
 * const MyComponent = () => {
 *    const locale = useLocale();
 *
 *    return <div>Current Locale is: {locale}</div>;
 * };
 * ```
 *
 * @module
 */

import { useSyncExternalStore } from "react";

import {
    addDarkSubscriber,
    addLocaleSubscriber,
    getLocale,
    isDark,
} from "@pistonite/pure/pref";

/**
 * Hook to get the current dark mode state
 */
export const useDark = (): boolean => {
    return useSyncExternalStore(addDarkSubscriber, isDark);
};

/**
 * Hook to get the current locale
 */
export const useLocale = (): string => {
    return useSyncExternalStore(addLocaleSubscriber, getLocale);
};

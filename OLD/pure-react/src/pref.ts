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
 * ## Display mode
 * The `useDisplayMode` hook returns the current display mode, and subscribes to changes.
 *
 * You should make a custom typed export to make sure it's type safe.
 *
 * ```typescript
 * import { useDisplayMode as pureUseDisplayMode } from "@pistonite/pure-react";
 * export const useDisplayMode = pureUseDisplayMode<MyDisplayMode>;
 * ```
 *
 * See documentation for pure for more examples.
 *
 * ```tsx
 * import { useDisplayMode } from "@pistonite/pure-react";
 *
 * const MyComponent = () => {
 *    const displayMode = useDisplayMode();
 *
 *    return <div>Current Locale is: {displayMode}</div>;
 * };
 * ```
 *
 * @module
 */

import { useSyncExternalStore } from "react";

import {
    addDarkSubscriber,
    addLocaleSubscriber,
    addDisplayModeSubscriber,
    getLocale,
    isDark,
    getDisplayMode,
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

/**
 * Hook to get the display mode
 */
export const useDisplayMode = <T extends string>(): T => {
    return useSyncExternalStore(addDisplayModeSubscriber<T>, getDisplayMode<T>);
};

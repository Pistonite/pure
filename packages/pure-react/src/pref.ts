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

import { useState, useEffect } from "react";

import {
    addDarkSubscriber,
    addLocaleSubscriber,
    getLocale,
    isDark,
    removeDarkSubscriber,
    removeLocaleSubscriber,
} from "@pistonite/pure/pref";

/**
 * Hook to get the current dark mode state
 */
export const useDark = (): boolean => {
    const [value, setValue] = useState(isDark);
    useEffect(() => {
        const dark = isDark();
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

/**
 * Hook to get the current locale
 */
export const useLocale = (): string => {
    const [locale, setLocale] = useState(getLocale);
    useEffect(() => {
        const l = getLocale();
        if (l !== locale) {
            setLocale(l);
        }
        const subscriber = (locale: string) => {
            setLocale(locale);
        };
        addLocaleSubscriber(subscriber);
        return () => {
            removeLocaleSubscriber(subscriber);
        };
    }, []);
    return locale;
};

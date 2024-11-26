/**
 * # pure/pref/locale
 * Locale utilities and integration with i18next
 *
 * ## Initialization
 * `initLocale` must be called before using the other functions.
 *
 * ```typescript
 * import { initLocale } from "@pistonite/pure/pref";
 *
 * initLocale({
 *     // required
 *     supported: ["en", "zh-CN", "zh-TW"] as const,
 *     default: "en",
 *
 *     // optional
 *     persist: true, // save to localStorage
 *     initial: "en-US", // initial value, instead of detecting
 * });
 * ```
 *
 * ## Connecting with i18next
 * The typical usage for this component is to use i18next for localization.
 * This module provides 2 plugins:
 * - `detectLocale`:
 *   - Provide the current language to i18next (as a language detector)
 *   - Update the global locale state whenever `i18next.changeLanguage` is called
 * - `connectI18next`:
 *   - Call `i18next.changeLanguage` whenever `setLocale` is called
 *
 * You might only need one of these plugins, depending on your use case.
 * For example, if you will never call `setLocale` manually, then you don't need `connectI18next`.
 *
 * ```typescript
 * import i18next from "i18next";
 * import { initLocale, detectLocale, connectI18next } from "@pistonite/pure/pref";
 *
 * // initialize locale
 * initLocale({ supported: ["en", "es"], default: "en", persist: true });
 *
 * // connect with i18next
 * i18next.use(detectLocale).use(connectI18next).init({
 *   // ...other options not shown
 * });
 * ```
 *
 * ## Use with React
 * A React hook is provided in the [`pure-react`](https://jsr.io/@pistonite/pure-react/doc/pref) package
 * to get the current locale from React components.
 *
 * Changing the locale from React components is the same as from outside React,
 * with `setLocale` or `i18next.changeLanguage`, depending on your setup.
 *
 * @module
 */

const KEY = "Pure.Locale";

let supportedLocales: readonly string[] = [];
let locale: string = "";
let defaultLocale: string = "";
const subscribers: ((locale: string) => void)[] = [];

/**
 * Use browser API to guess user's preferred locale
 */
export const getPreferredLocale = (): string => {
    if (globalThis.Intl) {
        try {
            return globalThis.Intl.NumberFormat().resolvedOptions().locale;
        } catch {
            // ignore
        }
    }
    if (globalThis.navigator?.languages) {
        return globalThis.navigator.languages[0];
    }
    return "";
};

export type LocaleOptions<TLocale extends string> = {
    /**
     * List of supported locale or languages.
     * These can be full locale strings like "en-US" or just languages like "en"
     */
    supported: readonly TLocale[];
    /**
     * The default locale if the user's preferred locale is not supported.
     * This must be one of the items in `supported`.
     */
    default: TLocale;
    /**
     * Initial value for locale
     *
     * If not set, it will default to calling `getPreferredLocale()`,
     * which is based on the browser's language settings.
     *
     * If `persist` is `true`, it will also check the value from localStorage
     *
     * If the initial value is not supported, it will default to the default locale
     */
    initial?: TLocale;

    /**
     * Persist the locale preference to localStorage
     */
    persist?: boolean;
};

/** Initialize locale global state */
export const initLocale = <TLocale extends string>(
    options: LocaleOptions<TLocale>,
): void => {
    let _locale = "";
    supportedLocales = options.supported;
    if (options.initial) {
        _locale = options.initial;
    } else {
        _locale =
            convertToSupportedLocale(getPreferredLocale()) || options.default;
    }
    defaultLocale = options.default;
    if (options.persist) {
        const value = localStorage.getItem(KEY);
        if (value !== null) {
            const supported = convertToSupportedLocale(value);
            if (supported) {
                _locale = supported;
            }
        }
        addLocaleSubscriber((locale: string) => {
            localStorage.setItem(KEY, locale);
        });
    } else {
        localStorage.removeItem(KEY);
    }

    setLocale(_locale);
};

/**
 * Clear the locale preference previously presisted to localStorage
 *
 * If you are doing this, you should probably call `setLocale`
 * or `i18next.changeLanguage` (depending on your setup) immediately
 * before this with `convertToSupportedLocaleOrDefault(getPreferredLocale())`
 * so the current locale is set to user's preferred locale.
 *
 * Note if `persist` is `true` when initializing,
 * subsequence `setLocale` calls will still persist the value.
 */
export const clearPersistedLocalePreference = (): void => {
    localStorage.removeItem(KEY);
};

/** Get the current selected locale */
export const getLocale = (): string => {
    return locale;
};

/** Get the default locale when initialized */
export const getDefaultLocale = (): string => {
    return defaultLocale;
};

/**
 * Set the selected locale
 *
 * Returns `false` if the locale is not supported
 */
export const setLocale = (newLocale: string): boolean => {
    const supported = convertToSupportedLocale(newLocale);
    if (!supported) {
        return false;
    }
    if (supported === locale) {
        return true;
    }
    locale = supported;
    const len = subscribers.length;
    for (let i = 0; i < len; i++) {
        subscribers[i](locale);
    }
    return true;
};

/**
 * Convert a locale/language to a supported locale/language
 *
 * Returns `undefined` if no supported locale is found
 *
 * # Example
 * It will first try to find an exact match for a locale (not language).
 * If not found, it will try:
 * - the first supported locale with a matching language
 * - the first supported language
 * ```typescript
 * import { convertToSupportedLocale } from "@pistonite/pure/pref";
 *
 * // suppose supported locales are ["en", "zh", "zh-CN"]
 * console.log(convertToSupportedLocale("en"));    // "en"
 * console.log(convertToSupportedLocale("en-US")); // "en"
 * console.log(convertToSupportedLocale("zh"));    // "zh-CN"
 * console.log(convertToSupportedLocale("zh-CN")); // "zh-CN"
 * console.log(convertToSupportedLocale("zh-TW")); // "zh"
 * console.log(convertToSupportedLocale("es"));    // undefined
 * ```
 */
export const convertToSupportedLocale = (
    newLocale: string,
): string | undefined => {
    if (supportedLocales.includes(newLocale)) {
        return newLocale;
    }
    const language = newLocale.split("-", 2)[0];
    const len = supportedLocales.length;
    for (let i = 0; i < len; i++) {
        if (supportedLocales[i].startsWith(language)) {
            return supportedLocales[i];
        }
    }
    return undefined;
};

/**
 * Convert a locale/language to a supported locale/language,
 * or return the default locale if not found.
 *
 * This is a thin wrapper for `convertToSupportedLocale`.
 * See that function for more details.
 */
export const convertToSupportedLocaleOrDefault = (
    newLocale: string,
): string => {
    return convertToSupportedLocale(newLocale) || defaultLocale;
};

/**
 * Add a subscriber to be notified when the locale changes
 *
 * If `notifyImmediately` is `true`, the subscriber will be called immediately with the current locale
 */
export const addLocaleSubscriber = (
    fn: (locale: string) => void,
    notifyImmediately?: boolean,
): void => {
    subscribers.push(fn);
    if (notifyImmediately) {
        fn(locale);
    }
};

/**
 * Remove a subscriber from locale changes
 */
export const removeLocaleSubscriber = (fn: (locale: string) => void): void => {
    const index = subscribers.indexOf(fn);
    if (index !== -1) {
        subscribers.splice(index, 1);
    }
};

/**
 * Language detector plugin for i18next
 *
 * **Must call `initLocale` before initializaing i18next**
 *
 * This also sets the global locale state whenever `i18next.changeLanguage` is called.
 *
 * # Example
 * ```typescript
 * import i18next from "i18next";
 * import { initLocale, detectLocale } from "@pistonite/pure/pref";
 *
 * initLocale({ supported: ["en", "es"], default: "en", persist: true });
 *
 * i18next.use(detectLocale).init({
 *   // don't need to specify `lng` here
 *
 *   // ...other options not shown
 * });
 * ```
 *
 */
export const detectLocale = {
    type: "languageDetector" as const,
    detect: () => locale,
    cacheUserLanguage: (lng: string): void => {
        setLocale(lng);
    },
};

/**
 * Bind the locale state to i18next, so whenever `setLocale`
 * is called, it will also call `i18next.changeLanguage`.
 *
 * # Example
 * ```typescript
 * import i18next from "i18next";
 * import { connectI18next, initLocale } from "@pistonite/pure/pref";
 *
 * initLocale({ supported: ["en", "es"], default: "en", persist: true });
 * i18next.use(connectI18next).init({
 *  // ...options
 * });
 *
 */
export const connectI18next = {
    type: "3rdParty" as const,
    init: (i18next: any): void => {
        addLocaleSubscriber((locale) => {
            if (i18next.language !== locale) {
                i18next.changeLanguage(locale);
            }
        }, true);
    },
};

const localizedLanguageNames = new Map();

/**
 * Get the localized name of a language using `Intl.DisplayNames`.
 *
 * The results are interanlly cached, so you don't need to cache this yourself.
 */
export const getLocalizedLanguageName = (language: string): string => {
    if (language === "zh" || language === "zh-CN") {
        return "\u7b80\u4f53\u4e2d\u6587";
    }
    if (language === "zh-TW") {
        return "\u7e41\u9ad4\u4e2d\u6587";
    }
    if (localizedLanguageNames.has(language)) {
        return localizedLanguageNames.get(language);
    }
    const languageWithoutLocale = language.split("-")[0];
    const localized = new Intl.DisplayNames([language], {
        type: "language",
    }).of(languageWithoutLocale);
    localizedLanguageNames.set(language, localized);
    return localized || language;
};

import { persist } from "../memory/persist.ts";
import type { Result } from "../result/index.ts";
import { serial } from "../sync/serial.ts";

let supportedLocales: readonly string[] = [];
let defaultLocale: string = "";
let settingLocale: string = ""; // if locale is being set (setLocale called)
let onBeforeChangeHook: (newLocale: string) => Promise<Result<void, "cancel">> = () => {
    return Promise.resolve({} as Result<void, "cancel">);
};
const locale = persist<string>({
    initial: "",
    key: "Pure.Locale",
    storage: localStorage,
    serialize: (value) => value,
    deserialize: (value) => {
        const supported = convertToSupportedLocale(value);
        return supported || null;
    },
});

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

    /**
     * Hook to be called by `setLocale`, but before setting the locale and thus notifying
     * the subscribers.
     *
     * Internally, this is synchronized by the `serial` function, which means
     * if another `setLocale` is called before the hook finishes, the set operation of the current
     * call will not happen and the locale will only be set after the hook finishes in the new call.
     *
     * If there are race conditions in the hook, `checkCancel` should be used after any async operations,
     * which will throw an error if another call happened.
     *
     * Note that this hook will not be called during initialization.
     */
    onBeforeChange?: (newLocale: string, checkCancel: () => void) => void | Promise<void>;
};

/**
 * Initialize Locale utilities
 *
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
 * The `@pistonite/pure-i18next` package provides additional wrapper
 * for connecting with i18next. See the documentation there for more details.
 * You will use `initLocaleWithI18next` instead of `initLocale`.
 *
 * ## Use with React
 * A React hook is provided in the [`pure-react`](https://jsr.io/@pistonite/pure-react/doc/pref) package
 * to get the current locale from React components.
 *
 * Changing the locale from React components is the same as from outside React,
 * with `setLocale` or `i18next.changeLanguage`, depending on your setup.
 */
export const initLocale = <TLocale extends string>(options: LocaleOptions<TLocale>): void => {
    if (options.onBeforeChange) {
        const onBeforeChange = options.onBeforeChange;
        onBeforeChangeHook = serial({
            fn: (checkCancel) => async (newLocale: string) => {
                await onBeforeChange(newLocale, checkCancel);
            },
        });
    }

    let _locale = "";
    supportedLocales = options.supported;
    if (options.initial) {
        _locale = options.initial;
    } else {
        _locale = convertToSupportedLocale(getPreferredLocale()) || options.default;
    }
    defaultLocale = options.default;
    if (options.persist) {
        locale.init(_locale);
    } else {
        locale.disable();
        locale.set(_locale);
    }
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
    locale.clear();
};

/** Get the current selected locale */
export const getLocale = (): string => locale.get();

/** Get the default locale when initialized */
export const getDefaultLocale = (): string => {
    return defaultLocale;
};

/**
 * Set the selected locale
 *
 * Returns `false` if the locale is not supported.
 *
 * onBeforeChange hook is called regardless of if the new locale
 * is the same as the current locale. If the hook is asynchronous and
 * another `setLocale` is called before it finishes, the locale will not be set
 * with the current call and will be set with the new call instead.
 */
export const setLocale = (newLocale: string): boolean => {
    const supported = convertToSupportedLocale(newLocale);
    if (!supported) {
        return false;
    }
    if (supported === settingLocale) {
        return true;
    }
    settingLocale = supported;
    void onBeforeChangeHook(supported).then((result) => {
        if (result.err) {
            return;
        }
        settingLocale = "";
        locale.set(supported);
    });
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
export const convertToSupportedLocale = (newLocale: string): string | undefined => {
    return convertToSupportedLocaleIn(newLocale, supportedLocales);
};

/**
 * See {@link convertToSupportedLocale}
 *
 * This takes the supported locale array so it can be used
 * outside of the locale system
 */
export const convertToSupportedLocaleIn = (
    newLocale: string,
    supportedLocalesToCheck: string[] | readonly string[],
): string | undefined => {
    if (supportedLocalesToCheck.includes(newLocale)) {
        return newLocale;
    }
    const language = newLocale.split("-", 2)[0];
    const len = supportedLocalesToCheck.length;
    for (let i = 0; i < len; i++) {
        if (supportedLocalesToCheck[i].startsWith(language)) {
            return supportedLocalesToCheck[i];
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
export const convertToSupportedLocaleOrDefault = (newLocale: string): string => {
    return convertToSupportedLocale(newLocale) || defaultLocale;
};

/**
 * Add a subscriber to be notified when the locale changes.
 * Returns a function to remove the subscriber
 *
 * If `notifyImmediately` is `true`, the subscriber will be called immediately with the current locale.
 * Note that it's not guaranteed that the new locale is ready when the subscriber is notified.
 * Any async operations such as loading the language files should be done in the
 * `onBeforeChange` hook if the subscribers need to wait for it.
 */
export const addLocaleSubscriber = (
    fn: (locale: string) => void,
    notifyImmediately?: boolean,
): (() => void) => {
    return locale.subscribe(fn, notifyImmediately);
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

/** Get the array of supported locales passed to init */
export const getSupportedLocales = (): readonly string[] => supportedLocales;

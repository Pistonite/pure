import type { LocaleOptions } from "@pistonite/pure/pref";

/**
 * Type alias for a function that loads language files
 *
 * The language loader can either throw or return `undefined` if the language fails to load
 */
export type LoadLanguageFn = (
    language: string,
) => Promise<Record<string, string> | undefined>;

/**
 * Option for initializing locale with i18next integration
 */
export type LocaleOptionsWithI18next<TLocale extends string> =
    LocaleOptions<TLocale> & {
        /**
         * The sync mode between i18next and pure. Default is "full"
         *
         * With "full", either `setLocale` or `i18next.changeLanguage` will sync the other.
         * For other modes, changing the first will sync to the second, but not the other way around.
         *
         * "full" or "i18next-pure" will also sync the initially detected language from pure to i18next
         */
        sync?: "full" | "i18next-pure" | "pure-i18next";

        /**
         * If the react-i18next integration should be enabled (true by default, if not specified)
         */
        react?: boolean;

        /**
         * The language loader function(s).
         *
         * If a function is provided, it will be called for the "translations" namespace.
         * Otherwise, you can provide a record of functions for each namespace.
         */
        loader: LoadLanguageFn | Record<string, LoadLanguageFn>;
    };

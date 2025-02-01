import type { i18n, LanguageDetectorModule, ThirdPartyModule } from "i18next";

import {
    addLocaleSubscriber,
    getLocale,
    setLocale,
} from "@pistonite/pure/pref";

/**
 * Language detector plugin for i18next
 */
export const syncI18nextToPureModule: LanguageDetectorModule = {
    type: "languageDetector" as const,
    detect: getLocale,
    cacheUserLanguage: (language: string): void => {
        setLocale(language);
    },
};

/**
 * Bind the locale state to i18next, so whenever `setLocale`
 * is called, it will also call `i18next.changeLanguage`.
 *
 */
export const syncPureToI18nextModule: ThirdPartyModule = {
    type: "3rdParty" as const,
    init: (i18next: i18n): void => {
        addLocaleSubscriber((locale) => {
            if (i18next.language !== locale) {
                i18next.changeLanguage(locale);
            }
        }, true);
    },
};

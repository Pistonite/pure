import type { LanguageDetectorModule } from "i18next";

import { getLocale, setLocale } from "@pistonite/pure/pref";

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

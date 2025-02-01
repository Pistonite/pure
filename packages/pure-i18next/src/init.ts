import i18next from "i18next";
import { initReactI18next } from "react-i18next";
import { initLocale } from "@pistonite/pure/pref";

import { syncI18nextToPureModule, syncPureToI18nextModule } from "./connect.ts";
import type { LocaleOptionsWithI18next } from "./types.ts";
import { createBackend } from "./backend.ts";

/**
 * Initialize locale system in Pure and connect it with I18next
 *
 * This function calls `initLocale` internally, so you don't need to do that yourself.
 *
 * ##
 */
export const initLocaleWithI18next = async <TLocale extends string>(
    options: LocaleOptionsWithI18next<TLocale>,
) => {
    const defaultLocale = options.default;
    initLocale(options);

    let instance = i18next;
    const syncMode = options.sync || "full";
    switch (syncMode) {
        case "full":
            instance = instance
                .use(syncPureToI18nextModule)
                .use(syncI18nextToPureModule);
            break;
        case "i18next-pure":
            instance = instance.use(syncI18nextToPureModule);
            break;
        case "pure-i18next":
            instance = instance.use(syncPureToI18nextModule);
            break;
    }
    const react = options.react ?? true;
    if (react) {
        instance = instance.use(initReactI18next);
    }

    const loader = options.loader;
    if (typeof loader === "function") {
        const backend = createBackend({ translations: loader }, defaultLocale);
        instance = instance.use(backend);
    } else {
        const backend = createBackend(loader, defaultLocale);
        instance = instance.use(backend);
    }

    await instance.init();
};

import i18next from "i18next";
import { initReactI18next } from "react-i18next";
import { initLocale } from "@pistonite/pure/pref";

import { syncI18nextToPureModule } from "./connect.ts";
import type { LocaleOptionsWithI18next } from "./types.ts";
import { createBackend } from "./backend.ts";

/**
 * Initialize locale system in Pure and connect it with I18next
 *
 * This function calls `initLocale` internally, so you don't need to do that yourself.
 */
export const initLocaleWithI18next = async <TLocale extends string>(
    options: LocaleOptionsWithI18next<TLocale>,
) => {
    const defaultLocale = options.default;
    let instance = i18next;
    const syncMode = options.sync || "full";
    const syncPureToI18next =
        syncMode === "full" || syncMode === "pure-i18next";
    const syncI18nextToPure =
        syncMode === "full" || syncMode === "i18next-pure";

    if (syncPureToI18next) {
        const onBeforeChangeOriginal = options.onBeforeChange;
        options = {
            ...options,
            onBeforeChange: async (newLocale, checkCancel) => {
                if (instance.language !== newLocale) {
                    await instance.changeLanguage(newLocale);
                }
                await onBeforeChangeOriginal?.(newLocale, checkCancel);
            },
        };
    }

    initLocale(options);

    if (syncI18nextToPure) {
        instance = instance.use(syncI18nextToPureModule);
    }

    const react = options.react ?? true;
    if (react) {
        instance = instance.use(initReactI18next);
    }

    const loader = options.loader;
    if (typeof loader === "function") {
        const backend = createBackend({ translation: loader }, defaultLocale);
        instance = instance.use(backend);
        await instance.init();
        return;
    }

    const backend = createBackend(loader, defaultLocale);
    instance = instance.use(backend);
    await instance.init({
        // make sure the namespaces are registered, so translations work
        // in contexts without react-i18next
        ns: Object.keys(loader),
    });
};

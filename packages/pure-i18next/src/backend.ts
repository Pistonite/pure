import type { BackendModule } from "i18next";
import { convertToSupportedLocale } from "@pistonite/pure/pref";

import type { LoadLanguageFn } from "./types.ts";
import { log } from "./util.ts";

/** Create an i18next backend module given the loader functions */
export const createBackend = (
    loaders: Record<string, LoadLanguageFn>,
    fallbackLocale: string,
): BackendModule => {
    const hasNonDefaultNamespace = Object.keys(loaders).some(
        (x) => x !== "translation",
    );
    const backend: BackendModule = {
        type: "backend",
        init: () => {
            // no init needed
        },
        read: async (language: string, namespace: string) => {
            if (language === "dev") {
                // don't load the default translation namespace
                return undefined;
            }
            const locale = convertToSupportedLocale(language) || fallbackLocale;
            const loader = loaders[namespace];
            if (!loader) {
                if (namespace !== "translation" || !hasNonDefaultNamespace) {
                    // only log an error if the namespace is not the default
                    // if there are non-default namespaces
                    log.error(`no loader found for namespace ${namespace}`);
                }
                return undefined;
            }
            try {
                const strings = await loader(locale);
                if (strings) {
                    return strings;
                }
            } catch (e) {
                log.error(e);
            }
            if (locale === fallbackLocale) {
                log.warn(`failed to load ${namespace} for ${locale}`);
                return undefined;
            }
            log.warn(
                `failed to load ${namespace} for ${locale}, falling back to ${fallbackLocale}`,
            );
            try {
                const strings = await loader(fallbackLocale);
                if (strings) {
                    return strings;
                }
            } catch (e) {
                log.error(e);
            }
            log.warn(
                `failed to load ${namespace} for fallback locale ${fallbackLocale}`,
            );
            return undefined;
        },
    };

    return backend;
};

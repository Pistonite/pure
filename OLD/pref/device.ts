import { ilog } from "../log/internal.ts";
import { cell } from "../memory";

let cachedIsMobile: boolean | undefined = undefined;

/** Check if the current UserAgent is a mobile device */
export const isMobile = (): boolean => {
    // just very primitive UA parsing for now,
    // we don't need to take another dependency just to detect
    // a few platforms
    if (cachedIsMobile === undefined) {
        const ua = navigator?.userAgent || "";
        if (ua.match(/(Windows NT|Macintosh|)/i)) {
            cachedIsMobile = false;
        } else if (ua.match(/(Mobil|iPhone|Android|iPod|iPad)/)) {
            cachedIsMobile = true;
        } else if (ua.includes("Linux")) {
            cachedIsMobile = false;
        } else {
            ilog.warn("unable to determine device type, assuming desktop");
            cachedIsMobile = true;
        }
    }
    return cachedIsMobile;
};

// stores current display mode
const displayMode = cell({ initial: "" });

/**
 * Options for display mode detection
 *
 * See {@link initDisplayMode}
 */
export type DisplayModeOptions<T extends string> = {
    /**
     * Set the initial value, if the platform doesn't support detecting
     * the display mode. `detect()` will be used instead if supported
     */
    initial?: T;
    /**
     * Function to determine the display mode based on viewport width and height,
     * and if the device is mobile
     */
    detect: (width: number, height: number, isMobile: boolean) => T;
};

/**
 * Initialize display mode detection for the app.
 *
 * The display mode may be based on the viewport dimensions
 * and if the device is mobile. Also note that you can use {@link isMobile}
 * without the display mode framework.
 *
 * The display modes are strings that should be passed as a type parameter
 * to {@link initDisplayMode}. You can create an alias in your code for
 * getting the typed version of {@link addDisplayModeSubscriber}, {@link getDisplayMode},
 * and {@link useDisplayMode} from `pure-react`.
 *
 * ```typescript
 * import {
 *     addDisplayModeSubscriber as pureAddDisplayModeSubscriber,
 *     getDisplayMode as pureGetDisplayMode,
 * } from "@pistonite/pure/pref";
 * import { useDisplayMode as pureUseDisplayMode } from "@pistonite/pure-react";
 *
 * export const MyDisplayModes = ["mode1", "mode2"] as const;
 * export type MyDisplayMode = (typeof MyDisplayModes)[number];
 *
 * export const addDisplayModeSubscriber = pureAddDisplayModeSubscriber<MyDisplayMode>;
 * export const getDisplayMode = pureGetDisplayMode<MyDisplayMode>;
 * export const useDisplayMode = pureUseDisplayMode<MyDisplayMode>;
 * ```
 *
 * Note that this is not necessary in some simple use cases. For example,
 * adjusting styles based on the viewport width can be done with CSS:
 * ```css
 * @media screen and (max-width: 800px) {
 *    /* styles for narrow mode * /
 * }
 * ```
 *
 * Use this only if the display mode needs to be detected programmatically.
 */
export const initDisplayMode = <T extends string>(options: DisplayModeOptions<T>) => {
    const detectCallback = () => {
        const mode = options.detect(window.innerWidth, window.innerHeight, isMobile());
        displayMode.set(mode);
    };
    if (
        window &&
        window.addEventListener &&
        window.innerWidth !== undefined &&
        window.innerHeight !== undefined
    ) {
        window.addEventListener("resize", detectCallback);
        detectCallback();
    } else if (options.initial !== undefined) {
        displayMode.set(options.initial);
    } else {
        ilog.warn(
            "display mode cannot be initialized, since detection is not supported and initial is not set",
        );
    }
};

/** Subscribe to display mode changes */
export const addDisplayModeSubscriber = <T extends string>(
    subscriber: (mode: T) => void,
    notifyImmediately?: boolean,
) => {
    return displayMode.subscribe(subscriber as (x: string) => void, notifyImmediately);
};

/** Get the current display mode */
export const getDisplayMode = <T extends string>(): T => {
    return displayMode.get() as T;
};

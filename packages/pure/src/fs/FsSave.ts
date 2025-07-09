import { ilog } from "../log/internal.ts";

import { fsFail, type FsVoid } from "./FsError.ts";

/** Save (download) a file using Blob */
export function fsSave(content: string | Uint8Array, filename: string): FsVoid {
    const blob = new Blob([content], {
        // maybe lying, but should be fine
        type: "text/plain;charset=utf-8",
    });

    try {
        saveAs(blob, filename);
        return {};
    } catch (e) {
        ilog.error(e);
        return { err: fsFail("save failed") };
    }
}

// The following code is adopted from
// - https://github.com/DefinitelyTyped/DefinitelyTyped/blob/master/types/file-saver/index.d.ts
// under this MIT license:
/*
This project is licensed under the MIT license.
Copyrights are respective of each contributor listed at the beginning of each definition file.

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 */

type SaveAsFn = (
    data: Blob | string,
    filename?: string,
    options?: SaveAsFnOptions,
) => void;
type SaveAsFnOptions = {
    autoBom: boolean;
};

/* eslint-disable @typescript-eslint/no-explicit-any */

// The following code is vendored from
// - https://github.com/eligrey/FileSaver.js/blob/master/src/FileSaver.js
// under this MIT license:
/*
 * FileSaver.js
 * A saveAs() FileSaver implementation.
 *
 * By Eli Grey, http://eligrey.com
 *
 * License : https://github.com/eligrey/FileSaver.js/blob/master/LICENSE.md (MIT)
 * source  : http://purl.eligrey.com/github/FileSaver.js
 */

// adoption note: this is now ECMA standard - https://github.com/tc39/proposal-global
// The one and only way of getting global scope in all environments
// https://stackoverflow.com/q/3277182/1008999
// const _global =
//     typeof window === "object" && window.window === window
//         ? window
//         : typeof self === "object" && self.self === self
//           ? self
//           : typeof global === "object" && global.global === global
//             ? global
//             : this;

const download = (url: string | URL, name?: string, opts?: SaveAsFnOptions) => {
    const xhr = new XMLHttpRequest();
    xhr.open("GET", url);
    xhr.responseType = "blob";
    xhr.onload = function () {
        saveAs(xhr.response, name, opts);
    };
    xhr.onerror = function () {
        console.error("could not download file");
    };
    xhr.send();
};

const corsEnabled = (url: string | URL) => {
    const xhr = new XMLHttpRequest();
    // use sync to avoid popup blocker
    xhr.open("HEAD", url, false);
    try {
        xhr.send();
    } catch {
        // ignore
    }
    return xhr.status >= 200 && xhr.status <= 299;
};

// adoption note: we drop support for old browsers, and just use click()
// original note: `a.click()` doesn't work for all browsers (#465)
// const click  = (node: Node) => {
//   try {
//     node.dispatchEvent(new MouseEvent('click'))
//   } catch {
//     const evt = document.createEvent('MouseEvents')
//     evt.initMouseEvent('click', true, true, window, 0, 0, 0, 80,
//                           20, false, false, false, false, 0, null)
//     node.dispatchEvent(evt)
//   }
// }

// adoption note: converted to check at call time, no need to
// do this check at boot load
const saveAs: SaveAsFn = (blob, name?, opts?) => {
    // adoption note: this is likely to throw if window is not defined.. ?
    if (typeof window !== "object" || window !== globalThis) {
        // probably in some web worker
        return;
    }
    // Detect WebView inside a native macOS app by ruling out all browsers
    // We just need to check for 'Safari' because all other browsers (besides Firefox) include that too
    // https://www.whatismybrowser.com/guides/the-latest-user-agent/macos
    const isMacOSWebView =
        globalThis.navigator &&
        /Macintosh/.test(navigator.userAgent) &&
        /AppleWebKit/.test(navigator.userAgent) &&
        !/Safari/.test(navigator.userAgent);
    // adoption note: removed blob.name, and pulled this line outside
    name = name || "download";

    if ("download" in HTMLAnchorElement.prototype && !isMacOSWebView) {
        const URL = globalThis.URL || globalThis.webkitURL;
        // Namespace is used to prevent conflict w/ Chrome Poper Blocker extension (Issue #561)
        const a = document.createElementNS(
            "http://www.w3.org/1999/xhtml",
            "a",
        ) as HTMLAnchorElement;

        a.download = name;
        a.rel = "noopener"; // tabnabbing

        // TODO: detect chrome extensions & packaged apps
        // a.target = '_blank'

        if (typeof blob === "string") {
            // Support regular links
            a.href = blob;
            if (a.origin !== location.origin) {
                // adoption note: removed turnery and changed click()
                if (corsEnabled(a.href)) {
                    download(blob, name, opts);
                } else {
                    a.target = "_blank";
                    a.click();
                }
            } else {
                // adoption note: changed click()
                a.click();
            }
        } else {
            // Support blobs
            a.href = URL.createObjectURL(blob);
            // adoption note: not sure why 40s
            setTimeout(() => {
                URL.revokeObjectURL(a.href);
            }, 4e4); // 40s
            // adoption note: changed click()
            setTimeout(() => {
                a.click();
            }, 0);
        }
        return;
    }

    // adoption note: drop IE support

    // Fallback to using FileReader and a popup
    // Open a popup immediately do go around popup blocker
    // Mostly only available on user interaction and the fileReader is async so...
    let popup = (window as any).popup || open("", "_blank");
    if (popup) {
        popup.document.title = popup.document.body.innerText = "downloading...";
    }

    if (typeof blob === "string") {
        return download(blob, name, opts);
    }

    const force = blob.type === "application/octet-stream";
    // adoption note: add any
    const isSafari =
        /constructor/i.test((globalThis as any).HTMLElement) ||
        (globalThis as any).safari;
    const isChromeIOS = /CriOS\/[\d]+/.test(navigator.userAgent);

    if (
        (isChromeIOS || (force && isSafari) || isMacOSWebView) &&
        typeof FileReader !== "undefined"
    ) {
        // Safari doesn't allow downloading of blob URLs
        const reader = new FileReader();
        reader.onloadend = function () {
            let url = reader.result as string;
            url = isChromeIOS
                ? url
                : url.replace(/^data:[^;]*;/, "data:attachment/file;");
            if (popup) {
                popup.location.href = url;
            } else {
                (location as any) = url;
            }
            popup = null; // reverse-tabnabbing #460
        };
        reader.readAsDataURL(blob);
    } else {
        const URL = globalThis.URL || globalThis.webkitURL;
        const url = URL.createObjectURL(blob);
        if (popup) {
            popup.location = url;
        } else {
            location.href = url;
        }
        popup = null; // reverse-tabnabbing #460
        setTimeout(function () {
            URL.revokeObjectURL(url);
        }, 4e4); // 40s
    }
};

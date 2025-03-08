import { errstr } from "../result";

import { fsErr, FsErr, fsFail, type FsResult } from "./FsError.ts";
import type { FsFileStandalone } from "./FsFileStandalone.ts";
import { FsFileStandaloneImplFileAPI } from "./FsFileStandaloneImplFileAPI.ts";
import { FsFileStandaloneImplHandleAPI } from "./FsFileStandaloneImplHandleAPI.ts";

/**
 * Prompt user to open a file
 *
 * FileSystemAccess API is used on supported platforms, which allows writing after
 * user grants the permission once at the time of writing to the file. If failed or not supported,
 * the DOM input element is used as a fallback.
 */
export const fsOpenFile = async (
    options?: FsFileOpenOptions,
): Promise<FsResult<FsFileStandalone>> => {
    const result = await fsOpenFileInternal(false, options || {});
    if (result.err) {
        return result;
    }
    if (!result.val.length) {
        return { err: fsErr(FsErr.UserAbort, "No files selected") };
    }
    return { val: result.val[0] };
};

/**
 * Prompt user to open multiple files
 *
 * FileSystemAccess API is used on supported platforms, which allows writing after
 * user grants the permission once at the time of writing to the file. If failed or not supported,
 * the DOM input element is used as a fallback.
 *
 * The returned array is guaranteed to have at least 1 file.
 */
export const fsOpenFileMultiple = async (
    options?: FsFileOpenOptions,
): Promise<FsResult<FsFileStandalone[]>> => {
    const result = await fsOpenFileInternal(true, options || {});
    if (result.err) {
        return result;
    }
    if (!result.val.length) {
        return { err: fsErr(FsErr.UserAbort, "No files selected") };
    }
    return result;
};

const fsOpenFileInternal = async (
    multiple: boolean,
    options: FsFileOpenOptions,
): Promise<FsResult<FsFileStandalone[]>> => {
    if (isFileSystemAccessAPISupportedForStandaloneFileOpen()) {
        const result = await fsOpenFileWithFileSystemAccessAPI(
            multiple,
            options,
        );
        if (result.val || result.err.code === FsErr.UserAbort) {
            return result;
        }
    }
    // fallback if FileSystemAccessAPI is not supported or fails
    return fsOpenFileWithFileAPI(multiple, options);
};

const fsOpenFileWithFileAPI = async (
    multiple: boolean,
    { types }: FsFileOpenOptions,
): Promise<FsResult<FsFileStandalone[]>> => {
    const element = document.createElement("input");
    element.type = "file";
    if (multiple) {
        element.multiple = true;
    }
    if (types?.length) {
        const accept = new Set<string>();
        const len = types.length;
        for (let i = 0; i < len; i++) {
            const acceptArray = types[i].accept;
            const acceptLen = acceptArray.length;
            for (let j = 0; j < acceptLen; j++) {
                const acceptValue = acceptArray[j];
                if (typeof acceptValue === "string") {
                    accept.add(acceptValue);
                } else {
                    const { mime, extensions } = acceptValue;
                    if (mime) {
                        accept.add(mime);
                    }
                    if (extensions.length) {
                        extensions.forEach((ext) => {
                            if (ext) {
                                accept.add(ext);
                            }
                        });
                    }
                }
            }
        }
        element.accept = Array.from(accept).join(",");
    }
    try {
        return new Promise((resolve) => {
            element.addEventListener("cancel", () => {
                resolve({
                    err: fsErr(FsErr.UserAbort, "cancel listener invoked"),
                });
            });
            element.addEventListener("change", () => {
                if (!element.files?.length) {
                    resolve({
                        err: fsErr(FsErr.UserAbort, "no files selected"),
                    });
                    return;
                }
                const array = [];
                for (let i = 0; i < element.files.length; i++) {
                    array.push(
                        new FsFileStandaloneImplFileAPI(element.files[i]),
                    );
                }
                resolve({ val: array });
            });
            element.click();
        });
    } catch (e) {
        return { err: fsFail(errstr(e)) };
    }
};

const fsOpenFileWithFileSystemAccessAPI = async (
    multiple: boolean,
    { id, types, disallowWildcard }: FsFileOpenOptions,
): Promise<FsResult<FsFileStandalone[]>> => {
    const convertedTypes = types?.map((type) => {
        const { description, accept } = type;
        const convertedAccept: Record<string, string[]> = {};
        const anyMimeType = [];
        const len = accept.length;
        for (let i = 0; i < len; i++) {
            const acceptValue = accept[i];
            if (typeof acceptValue === "string") {
                if (acceptValue) {
                    anyMimeType.push(acceptValue);
                }
                continue;
            }
            const { mime, extensions } = acceptValue;
            if (!mime || mime === "*/*") {
                anyMimeType.push(...extensions);
                continue;
            }
            if (mime in convertedAccept) {
                convertedAccept[mime].push(...extensions);
            } else {
                convertedAccept[mime] = [...extensions];
            }
        }
        if (anyMimeType.length) {
            convertedAccept["*/*"] = anyMimeType;
        }
        return {
            description,
            accept: convertedAccept,
        };
    });
    try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const output = await (globalThis as any).showOpenFilePicker({
            id,
            excludeAcceptAllOption: types && types.length && disallowWildcard,
            multiple,
            types: convertedTypes,
        });
        const len = output.length;
        const convertedOutput = [];
        for (let i = 0; i < len; i++) {
            convertedOutput.push(new FsFileStandaloneImplHandleAPI(output[i]));
        }
        return { val: convertedOutput };
    } catch (e) {
        if (e && typeof e === "object" && "name" in e) {
            if (e.name === "AbortError") {
                return { err: fsErr(FsErr.UserAbort, "User abort") };
            }
            if (e.name === "SecurityError") {
                return { err: fsErr(FsErr.PermissionDenied, "Security error") };
            }
        }
        return { err: fsFail(errstr(e)) };
    }
};

export type FsFileOpenOptions = {
    /**
     * ID for the file open operation
     *
     * Supported implementation can use this to open the picker in the same
     * directory for the same ID
     */
    id?: string;

    /**
     * If the "*.*" file type should be hidden in the picker.
     *
     * In unsupported implementations, this will be ignored, and the "*.*"
     * file type will always be visible.
     *
     * By default, this is false
     */
    disallowWildcard?: boolean;

    /** List of file types to accept */
    types?: FsFileOpenType[];
};

export type FsFileOpenType = {
    /**
     * Optional description for the type, which may display in the file picker
     *
     * In unsupported implementations, this will be ignored.
     */
    description?: string;

    /**
     * List of file mime types or extensions to accept for this file type
     *
     * String elements are file extensions, with the "." prefix. More context
     * can be provided with an object element with mime type and extensions to
     * have better file type descriptions in the picker (if supported).
     */
    accept: (FsFileOpenTypeAccept | string)[];
};

export type FsFileOpenTypeAccept = {
    /** Optional mime type, which the browser can be used to display file type descriptions */
    mime?: string;
    /** extensions to accept (with the "." prefix) */
    extensions: string[];
};

const isFileSystemAccessAPISupportedForStandaloneFileOpen = () => {
    if (!globalThis || !globalThis.isSecureContext) {
        return false;
    }
    if (
        !("showOpenFilePicker" in globalThis) ||
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        typeof (globalThis as any).showOpenFilePicker !== "function"
    ) {
        return false;
    }
    if (!globalThis.FileSystemFileHandle) {
        return false;
    }
    if (!globalThis.FileSystemFileHandle.prototype.getFile) {
        return false;
    }
    if (!globalThis.FileSystemFileHandle.prototype.createWritable) {
        return false;
    }
    return true;
};

import { ilog } from "../log/internal.ts";
import { errstr } from "../result";

import { fsErr, FsErr, fsFail, type FsVoid, type FsResult } from "./FsError.ts";
import type { FsFileStandalone } from "./FsFileStandalone.ts";

export class FsFileStandaloneImplHandleAPI implements FsFileStandalone {
    name: string;
    private handle: FileSystemFileHandle;
    constructor(handle: FileSystemFileHandle) {
        this.name = handle.name;
        this.handle = handle;
    }

    public async isWritable(): Promise<boolean> {
        if (
            !("queryPermission" in this.handle) ||
            !(typeof this.handle.queryPermission === "function")
        ) {
            return false;
        }
        try {
            const permission = await this.handle.queryPermission({
                mode: "readwrite",
            });
            if (permission === "granted") {
                return true;
            }
            if (permission === "denied") {
                return false;
            }
            if (
                !("requestPermission" in this.handle) ||
                !(typeof this.handle.requestPermission === "function")
            ) {
                return false;
            }
            const requestedPermission = await this.handle.requestPermission({
                mode: "readwrite",
            });
            return requestedPermission === "granted";
        } catch (e) {
            ilog.error(e);
            return false;
        }
    }

    private async getFile(): Promise<FsResult<File>> {
        try {
            return { val: await this.handle.getFile() };
        } catch (e) {
            if (e && typeof e === "object" && "name" in e) {
                if (e.name === "NotAllowedError") {
                    return {
                        err: fsErr(FsErr.PermissionDenied, "Permission denied"),
                    };
                }
                if (e.name === "NotFoundError") {
                    return { err: fsErr(FsErr.NotFound, "File not found") };
                }
            }
            ilog.error(e);
            return { err: fsFail(errstr(e)) };
        }
    }

    public async getSize(): Promise<FsResult<number>> {
        const file = await this.getFile();
        if (file.err) {
            return file;
        }
        return { val: file.val.size };
    }
    public async getBytes(): Promise<FsResult<Uint8Array>> {
        const file = await this.getFile();
        if (file.err) {
            return file;
        }
        try {
            const data = await file.val.arrayBuffer();
            return { val: new Uint8Array(data) };
        } catch (e) {
            ilog.error(e);
            return { err: fsFail(errstr(e)) };
        }
    }
    public async getLastModified(): Promise<FsResult<number>> {
        const file = await this.getFile();
        if (file.err) {
            return file;
        }
        return { val: file.val.lastModified };
    }
    public async getText(): Promise<FsResult<string>> {
        const file = await this.getFile();
        if (file.err) {
            return file;
        }
        try {
            const data = await file.val.text();
            return { val: data };
        } catch (e) {
            ilog.error(e);
            return { err: fsFail(errstr(e)) };
        }
    }
    public async write(content: Uint8Array | string): Promise<FsVoid> {
        const writable = await this.isWritable();
        if (!writable) {
            return {
                err: fsErr(
                    FsErr.NotSupported,
                    "Permission was not granted or API not supported",
                ),
            };
        }
        try {
            const stream = await this.handle.createWritable();
            await stream.write(content);
            await stream.close();
            return {};
        } catch (e) {
            if (e && typeof e === "object" && "name" in e) {
                if (e.name === "NotAllowedError") {
                    return {
                        err: fsErr(FsErr.PermissionDenied, "Permission denied"),
                    };
                }
                if (e.name === "NotFoundError") {
                    return { err: fsErr(FsErr.NotFound, "File not found") };
                }
                if (e.name === "NoMidificationAllowedError") {
                    return {
                        err: fsErr(
                            FsErr.PermissionDenied,
                            "Failed to acquire write lock",
                        ),
                    };
                }
                if (e.name === "AbortError") {
                    return { err: fsErr(FsErr.UserAbort, "User abort") };
                }
                if (e.name === "QuotaExceededError") {
                    return {
                        err: fsErr(FsErr.PermissionDenied, "Quota exceeded"),
                    };
                }
            }
            ilog.error(e);
            return { err: fsFail(errstr(e)) };
        }
    }
}

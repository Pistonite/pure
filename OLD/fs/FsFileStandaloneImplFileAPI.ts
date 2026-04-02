import { ilog } from "../log/internal.ts";
import { errstr } from "../result";

import { fsErr, FsErr, fsFail, type FsVoid, type FsResult } from "./FsError.ts";
import type { FsFileStandalone } from "./FsFileStandalone.ts";

export class FsFileStandaloneImplFileAPI implements FsFileStandalone {
    public name: string;
    private size: number;
    private lastModified: number;
    private file: File;

    constructor(file: File) {
        this.name = file.name;
        this.size = file.size;
        this.lastModified = file.lastModified;
        this.file = file;
    }

    public async isWritable(): Promise<boolean> {
        return false;
    }

    public async getSize(): Promise<FsResult<number>> {
        return { val: this.size };
    }

    public async getBytes(): Promise<FsResult<Uint8Array>> {
        try {
            const data = await this.file.arrayBuffer();
            return { val: new Uint8Array(data) };
        } catch (e) {
            ilog.error(e);
            return { err: fsFail(errstr(e)) };
        }
    }
    public async getLastModified(): Promise<FsResult<number>> {
        return { val: this.lastModified };
    }
    public async getText(): Promise<FsResult<string>> {
        try {
            const data = await this.file.text();
            return { val: data };
        } catch (e) {
            ilog.error(e);
            return { err: fsFail(errstr(e)) };
        }
    }
    public async write(): Promise<FsVoid> {
        return {
            err: fsErr(FsErr.NotSupported, "Write not supported in File API"),
        };
    }
}

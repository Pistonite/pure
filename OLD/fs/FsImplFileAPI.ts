import { ilog } from "../log/internal.ts";

import type { FsFile } from "./FsFile.ts";
import type { FsFileSystem, FsFileSystemUninit, FsCapabilities } from "./FsFileSystem.ts";
import { FsErr, type FsResult, type FsVoid, fsErr } from "./FsError.ts";
import { fsIsRoot, fsNormalize } from "./FsPath.ts";
import { FsFileMgr } from "./FsFileMgr.ts";
import type { FsFileSystemInternal } from "./FsFileSystemInternal.ts";

/**
 * FileSystem implementation that uses a list of Files
 * This is supported in all browsers, but it is stale.
 * It's used for Firefox when the File Entries API is not available
 * i.e. opened from <input type="file">
 */
export class FsImplFileAPI implements FsFileSystemUninit, FsFileSystem, FsFileSystemInternal {
    public root: string;
    public capabilities: FsCapabilities;

    private files: Record<string, File>;
    private directories: Record<string, string[]>;
    private mgr: FsFileMgr;

    constructor(files: FileList) {
        // this seems to also work for windows
        this.root = files[0].webkitRelativePath.split("/", 1)[0];
        this.capabilities = { write: false, live: false };
        this.files = {};
        this.directories = {};
        this.mgr = new FsFileMgr();

        for (let i = 0; i < files.length; i++) {
            const file = files[i];
            // remove "<root>/"
            const path = file.webkitRelativePath.slice(this.root.length + 1);
            const normalized = fsNormalize(path);
            if (normalized.err) {
                // shouldn't happen since the path is from the File API
                ilog.error("invalid path: " + path);
                continue;
            }
            this.files[normalized.val] = file;
        }
    }

    public init(): Promise<FsResult<FsFileSystem>> {
        // no init needed
        return Promise.resolve({ val: this });
    }

    public listDir(path: string): Promise<FsResult<string[]>> {
        const normalized = fsNormalize(path);
        if (normalized.err) {
            return Promise.resolve(normalized);
        }
        path = normalized.val;

        if (path in this.directories) {
            return Promise.resolve({ val: this.directories[path] });
        }

        const set = new Set<string>();
        const prefix = fsIsRoot(path) ? "" : path + "/";

        Object.keys(this.files).forEach((path) => {
            if (!path.startsWith(prefix)) {
                return;
            }
            const relPath = path.slice(prefix.length);
            const slashIndex = relPath.indexOf("/");
            if (slashIndex < 0) {
                // file
                set.add(relPath);
            } else {
                // directory
                const dir = relPath.slice(0, slashIndex + 1);
                set.add(dir);
            }
        });

        const paths = Array.from(set);
        this.directories[path] = paths;

        return Promise.resolve({ val: paths });
    }

    public read(path: string): Promise<FsResult<File>> {
        const normalized = fsNormalize(path);
        if (normalized.err) {
            return Promise.resolve(normalized);
        }

        const file = this.files[normalized.val];
        if (!file) {
            const err = fsErr(FsErr.NotFound, "File not found: " + path);
            return Promise.resolve({ err });
        }

        return Promise.resolve({ val: file });
    }

    public write(): Promise<FsVoid> {
        const err = fsErr(FsErr.NotSupported, "Write not supported in File API");
        return Promise.resolve({ err });
    }

    public getFile(path: string): FsFile {
        return this.mgr.get(this, path);
    }
    public getOpenedPaths(): string[] {
        return this.mgr.getOpenedPaths();
    }
    public closeFile(path: string): void {
        this.mgr.close(path);
    }
}

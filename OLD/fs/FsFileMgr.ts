import type { FsFile } from "./FsFile.ts";
import type { FsFileSystemInternal } from "./FsFileSystemInternal.ts";
import { fsFile } from "./FsFileImpl.ts";

/** Internal class to track opened files */
export class FsFileMgr {
    private opened: Map<string, FsFile>;

    public constructor() {
        this.opened = new Map();
    }

    public get(fs: FsFileSystemInternal, path: string): FsFile {
        let file = this.opened.get(path);
        if (!file) {
            file = fsFile(fs, path);
            this.opened.set(path, file);
        }
        return file;
    }

    public close(path: string): void {
        this.opened.delete(path);
    }

    public getOpenedPaths(): string[] {
        return Array.from(this.opened.keys());
    }
}

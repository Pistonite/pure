import type { FsResult, FsVoid } from "./FsError.ts";

/**
 * Interface for operating on a file opened standalone (without opening a file system
 */
export interface FsFileStandalone {
    /** The name of the file */
    readonly name: string;
    /** If the file is writable. May prompt user for permission */
    isWritable(): Promise<boolean>;
    /** Get the size of the file */
    getSize(): Promise<FsResult<number>>;
    /** Get the content of the file as a byte array */
    getBytes(): Promise<FsResult<Uint8Array>>;
    /** Get the last modified time of the file */
    getLastModified(): Promise<FsResult<number>>;
    /** Get the text content of the file*/
    getText(): Promise<FsResult<string>>;
    /** Write content to the file if the implementation supports writing, and permission is granted*/
    write(content: Uint8Array | string): Promise<FsVoid>;
}

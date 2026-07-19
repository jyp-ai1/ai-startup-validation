/** Stored object metadata. */
export type StorageObject = {
  path: string;
  bucket: string;
  size?: number;
  contentType?: string;
  createdAt?: string;
};

export type UploadOptions = {
  bucket?: string;
  contentType?: string;
  upsert?: boolean;
};

/** Port — object storage operations (hexagonal). */
export interface StoragePort {
  upload(
    path: string,
    file: Blob | ArrayBuffer | Uint8Array,
    options?: UploadOptions,
  ): Promise<StorageObject>;

  download(path: string, bucket?: string): Promise<Blob>;

  remove(path: string, bucket?: string): Promise<void>;

  signedUrl(path: string, expiresInSeconds: number, bucket?: string): Promise<string>;

  list(prefix: string, bucket?: string): Promise<StorageObject[]>;
}

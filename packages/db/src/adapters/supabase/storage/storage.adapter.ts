import { InternalServerError, NotFoundError } from '@repo/core/errors';
import type { SupabaseClient } from '@supabase/supabase-js';

import type {
  StorageObject,
  StoragePort,
  UploadOptions,
} from '../../../storage/storage.port';
import { getServiceClient } from '../service';

const DEFAULT_BUCKET = 'assets';

/** Supabase Storage implementation of StoragePort. */
export class SupabaseStorageAdapter implements StoragePort {
  private clientInstance: SupabaseClient | null = null;

  constructor(
    private readonly clientOverride?: SupabaseClient,
    private readonly defaultBucket = DEFAULT_BUCKET,
  ) {}

  private get client(): SupabaseClient {
    if (this.clientOverride) return this.clientOverride;
    if (!this.clientInstance) {
      this.clientInstance = getServiceClient();
    }
    return this.clientInstance;
  }

  private bucket(name?: string): string {
    return name ?? this.defaultBucket;
  }

  async upload(
    path: string,
    file: Blob | ArrayBuffer | Uint8Array,
    options?: UploadOptions,
  ): Promise<StorageObject> {
    const bucket = this.bucket(options?.bucket);
    const body =
      file instanceof Blob
        ? file
        : new Blob([file as BlobPart], {
            type: options?.contentType,
          });

    const { data, error } = await this.client.storage
      .from(bucket)
      .upload(path, body, {
        contentType: options?.contentType,
        upsert: options?.upsert ?? false,
      });

    if (error) {
      throw new InternalServerError(error.message);
    }

    return {
      path: data.path,
      bucket,
      contentType: options?.contentType,
    };
  }

  async download(path: string, bucket?: string): Promise<Blob> {
    const { data, error } = await this.client.storage
      .from(this.bucket(bucket))
      .download(path);

    if (error) {
      throw new NotFoundError(error.message);
    }

    return data;
  }

  async remove(path: string, bucket?: string): Promise<void> {
    const { error } = await this.client.storage
      .from(this.bucket(bucket))
      .remove([path]);

    if (error) {
      throw new InternalServerError(error.message);
    }
  }

  async signedUrl(
    path: string,
    expiresInSeconds: number,
    bucket?: string,
  ): Promise<string> {
    const { data, error } = await this.client.storage
      .from(this.bucket(bucket))
      .createSignedUrl(path, expiresInSeconds);

    if (error || !data?.signedUrl) {
      throw new InternalServerError(error?.message ?? 'Failed to create signed URL');
    }

    return data.signedUrl;
  }

  async list(prefix: string, bucket?: string): Promise<StorageObject[]> {
    const { data, error } = await this.client.storage
      .from(this.bucket(bucket))
      .list(prefix);

    if (error) {
      throw new InternalServerError(error.message);
    }

    return (data ?? []).map((item) => ({
      path: prefix ? `${prefix}/${item.name}` : item.name,
      bucket: this.bucket(bucket),
      size: item.metadata?.size as number | undefined,
      contentType: item.metadata?.mimetype as string | undefined,
      createdAt: item.created_at ?? undefined,
    }));
  }
}

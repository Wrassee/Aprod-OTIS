import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { promises as fs } from 'fs';
import path from 'path';

export class SupabaseStorageService {
  private supabase: SupabaseClient;
  private bucketName: string;
  private supabaseUrl: string;

  constructor() {
    const supabaseUrl = process.env.VITE_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;
    const bucketNameFromEnv = process.env.SUPABASE_BUCKET;

    if (!supabaseUrl || !supabaseServiceKey || !bucketNameFromEnv) {
      throw new Error(
        'Missing Supabase configuration. Please check VITE_SUPABASE_URL, SUPABASE_SERVICE_KEY, and SUPABASE_BUCKET environment variables.'
      );
    }

    this.supabaseUrl = supabaseUrl;
    this.bucketName = bucketNameFromEnv;
    this.supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
  }

  async uploadFile(filePath: string, storagePath: string): Promise<string> {
    const fileBuffer = await fs.readFile(filePath);

    const { error } = await this.supabase.storage
      .from(this.bucketName)
      .upload(storagePath, fileBuffer, {
        cacheControl: '3600',
        upsert: true,
        contentType: this.getContentType(storagePath),
      });

    if (error) throw error;

    const { data: { publicUrl } } = this.supabase.storage
      .from(this.bucketName)
      .getPublicUrl(storagePath);

    return publicUrl;
  }

  async downloadFile(storagePath: string, localPath: string): Promise<void> {
    const { data, error } = await this.supabase.storage
      .from(this.bucketName)
      .download(storagePath);

    if (error) throw error;
    if (!data) throw new Error('No data received from storage.');

    const buffer = Buffer.from(await data.arrayBuffer());
    const dir = path.dirname(localPath);
    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(localPath, buffer);
  }

  async deleteFile(storagePath: string): Promise<void> {
    // ❗ FONTOS: csak relatív path mehet ide (pl. templates/123.xlsx)
    const { error } = await this.supabase.storage
      .from(this.bucketName)
      .remove([storagePath]);

    if (error) throw error;
    console.log(`🗑️ Deleted file from Supabase: ${storagePath}`);
  }

  async fileExists(storagePath: string): Promise<boolean> {
    const parentDir = path.dirname(storagePath);
    const fileName = path.basename(storagePath);

    const { data, error } = await this.supabase.storage
      .from(this.bucketName)
      .list(parentDir, { limit: 1, search: fileName });

    if (error) return false;
    return data.length > 0;
  }

  private async createBucketIfNotExists(): Promise<void> {
    const { data } = await this.supabase.storage.getBucket(this.bucketName);
    if (data) return;

    const { error } = await this.supabase.storage.createBucket(this.bucketName, { public: true });
    if (error) throw new Error(`Failed to create bucket "${this.bucketName}": ${error.message}`);
  }

  private getContentType(fileName: string): string {
    const ext = path.extname(fileName).toLowerCase();
    const contentTypes: Record<string, string> = {
      '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      '.xls': 'application/vnd.ms-excel',
      '.pdf': 'application/pdf',
      '.png': 'image/png',
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
    };
    return contentTypes[ext] || 'application/octet-stream';
  }
}

export const supabaseStorage = new SupabaseStorageService();

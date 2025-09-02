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
      throw new Error('Missing Supabase configuration. Please check VITE_SUPABASE_URL, SUPABASE_SERVICE_KEY, and SUPABASE_BUCKET environment variables.');
    }

    this.supabaseUrl = supabaseUrl;
    this.bucketName = bucketNameFromEnv;
    this.supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });
  }
  
  async uploadFile(filePath: string, storagePath: string): Promise<string> {
    try {
      console.log(`📤 Uploading ${filePath} to ${this.bucketName}/${storagePath}`);
      
      const fileBuffer = await fs.readFile(filePath);
      
      const { error } = await this.supabase.storage
        .from(this.bucketName)
        .upload(storagePath, fileBuffer, {
          cacheControl: '3600',
          upsert: true,
          contentType: this.getContentType(storagePath)
        });

      if (error) {
        if (error.message.includes('Bucket not found')) {
            console.warn(`Bucket "${this.bucketName}" not found. Attempting to create it...`);
            await this.createBucketIfNotExists();
            return this.uploadFile(filePath, storagePath);
        }
        throw error;
      }

      const { data: { publicUrl } } = this.supabase.storage
        .from(this.bucketName)
        .getPublicUrl(storagePath);

      console.log(`✅ File uploaded successfully: ${publicUrl}`);
      return publicUrl;
    } catch (error: any) {
      console.error(`❌ Upload failed for ${filePath}:`, error.message);
      throw new Error(`Failed to upload file: ${error.message}`);
    }
  }

  async downloadFile(storagePath: string, localPath: string): Promise<void> {
    console.log(`📥 Initiating download for: ${storagePath}`);

    // JAVÍTÁS: Ellenőrizzük, hogy már teljes URL-e a storagePath
    let cleanPath: string;
    
    if (storagePath.startsWith('http')) {
      // Ha teljes URL, akkor csak a relatív részt használjuk
      const urlPattern = new RegExp(`${this.supabaseUrl}/storage/v1/object/public/${this.bucketName}/(.+)`);
      const match = storagePath.match(urlPattern);
      
      if (match) {
        cleanPath = decodeURIComponent(match[1]);
        console.log(`🔧 Extracted relative path from full URL: ${cleanPath}`);
      } else {
        throw new Error(`Invalid Supabase storage URL format: ${storagePath}`);
      }
    } else {
      // Ha relatív elérési út
      const pathWithoutBucket = storagePath.startsWith(`${this.bucketName}/`)
        ? storagePath.substring(this.bucketName.length + 1)
        : storagePath;
      
      cleanPath = decodeURIComponent(pathWithoutBucket);
    }
      
    const { data: { publicUrl } } = this.supabase.storage
      .from(this.bucketName)
      .getPublicUrl(cleanPath);
      
    console.log(`Correct Direct URL: ${publicUrl}`);

    try {
      const response = await fetch(publicUrl);

      if (!response.ok) {
        const errorBody = await response.text();
        console.error(`Direct download failed. Status: ${response.status}. Body: ${errorBody}`);
        throw new Error(`Direct download failed with status: ${response.status} ${response.statusText}`);
      }

      const arrayBuffer = await response.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      const dir = path.dirname(localPath);
      await fs.mkdir(dir, { recursive: true });
      await fs.writeFile(localPath, buffer);

      console.log(`✅ Direct download successful, file saved to: ${localPath}`);

    } catch (error: any) {
      console.error(`❌ Download failed for ${storagePath}:`, error);
      throw new Error(`Failed to download file: ${error.message || 'Unknown error'}`);
    }
  }

  async fileExists(storagePath: string): Promise<boolean> {
    try {
      const parentDir = path.dirname(storagePath);
      const fileName = path.basename(storagePath);

      const { data, error } = await this.supabase.storage
        .from(this.bucketName)
        .list(parentDir, { limit: 1, search: fileName });
      
      if (error) { return false; }
      return data.length > 0;
    } catch {
      return false;
    }
  }
  
  private async createBucketIfNotExists(): Promise<void> {
    const { data } = await this.supabase.storage.getBucket(this.bucketName);
    if (data) return;
    
    const { error } = await this.supabase.storage.createBucket(this.bucketName, { public: true });
    if (error) throw new Error(`Failed to create bucket "${this.bucketName}": ${error.message}`);
    console.log(`✅ Bucket "${this.bucketName}" created successfully.`);
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
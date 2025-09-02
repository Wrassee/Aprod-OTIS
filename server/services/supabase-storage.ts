import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { promises as fs } from 'fs';
import path from 'path';

export class SupabaseStorageService {
  private supabase: SupabaseClient;
  private bucketName: string;

  constructor() {
    // A konfiguráció és az ellenőrzés beköltözik a konstruktorba
    const supabaseUrl = process.env.VITE_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;
    const bucketNameFromEnv = process.env.SUPABASE_BUCKET;

    // Ez az ellenőrzés itt már helyesen szűkíti a típust a fordító számára is
    if (!supabaseUrl || !supabaseServiceKey || !bucketNameFromEnv) {
      throw new Error('Missing Supabase configuration. Please check VITE_SUPABASE_URL, SUPABASE_SERVICE_KEY, and SUPABASE_BUCKET environment variables.');
    }

    // Az osztály tulajdonságainak beállítása
    this.bucketName = bucketNameFromEnv;
    this.supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });
  }
  
  /**
   * Fájl feltöltése a Supabase Storage-be. Ha a bucket nem létezik, megpróbálja létrehozni.
   * @param filePath A feltöltendő helyi fájl elérési útja.
   * @param storagePath A cél elérési út a Supabase bucket-ben.
   * @returns A feltöltött fájl publikus URL-je.
   */
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

  /**
   * Fájl letöltése a Supabase Storage-ből direkt fetch kéréssel, kikerülve a Supabase klienst.
   * @param storagePath A letöltendő fájl elérési útja a bucket-ben.
   * @param localPath A helyi útvonal, ahova a fájlt menteni kell.
   */
  async downloadFile(storagePath: string, localPath: string): Promise<void> {
    console.log(`📥 Bypassing Supabase client, direct download initiated for: ${storagePath}`);
    
    // 1. Lekérjük a fájl publikus URL-jét
    const { data: { publicUrl } } = this.supabase.storage
      .from(this.bucketName)
      .getPublicUrl(storagePath);
      
    console.log(`Direct URL: ${publicUrl}`);

    try {
      // 2. Használunk egy egyszerű 'fetch' kérést a letöltéshez
      const response = await fetch(publicUrl);

      if (!response.ok) {
        throw new Error(`Direct download failed with status: ${response.status} ${response.statusText}`);
      }

      // 3. Alakítjuk át a választ bufferré
      const arrayBuffer = await response.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      // 4. Elmentjük a fájlt
      const dir = path.dirname(localPath);
      await fs.mkdir(dir, { recursive: true });
      await fs.writeFile(localPath, buffer);

      console.log(`✅ Direct download successful, file saved to: ${localPath}`);

    } catch (error: any) {
      console.error(`❌ Direct download failed for ${storagePath}:`, error);
      throw new Error(`Failed to download file via direct fetch: ${error.message || 'Unknown error'}`);
    }
  }

  /**
   * Ellenőrzi, hogy egy fájl létezik-e a storage-ben anélkül, hogy letöltené.
   * @param storagePath A keresett fájl elérési útja.
   * @returns Igaz, ha a fájl létezik.
   */
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
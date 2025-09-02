import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { promises as fs } from 'fs';
import path from 'path';

// Környezeti változók ellenőrzése
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;
const bucketName = process.env.SUPABASE_BUCKET;

// VISSZAÁLLÍTOTT ELLENŐRZÉS: Ez oldja meg a TS2345 build hibákat.
// Biztosítja a fordítót, hogy ezek a változók nem lesznek 'undefined'.
if (!supabaseUrl || !supabaseServiceKey || !bucketName) {
  throw new Error('Missing Supabase configuration. Please check VITE_SUPABASE_URL, SUPABASE_SERVICE_KEY, and SUPABASE_BUCKET environment variables.');
}

const supabase: SupabaseClient = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

export class SupabaseStorageService {
  
  /**
   * Fájl feltöltése a Supabase Storage-be. Ha a bucket nem létezik, megpróbálja létrehozni.
   * @param filePath A feltöltendő helyi fájl elérési útja.
   * @param storagePath A cél elérési út a Supabase bucket-ben.
   * @returns A feltöltött fájl publikus URL-je.
   */
  async uploadFile(filePath: string, storagePath: string): Promise<string> {
    try {
      console.log(`📤 Uploading ${filePath} to ${bucketName}/${storagePath}`);
      
      const fileBuffer = await fs.readFile(filePath);
      
      const { error } = await supabase.storage
        .from(bucketName)
        .upload(storagePath, fileBuffer, {
          cacheControl: '3600',
          upsert: true,
          contentType: this.getContentType(storagePath)
        });

      if (error) {
        if (error.message.includes('Bucket not found')) {
            console.warn(`Bucket "${bucketName}" not found. Attempting to create it...`);
            await this.createBucketIfNotExists();
            return this.uploadFile(filePath, storagePath);
        }
        throw error;
      }

      const { data: { publicUrl } } = supabase.storage
        .from(bucketName)
        .getPublicUrl(storagePath);

      console.log(`✅ File uploaded successfully: ${publicUrl}`);
      return publicUrl;
    } catch (error: any) {
      console.error(`❌ Upload failed for ${filePath}:`, error.message);
      throw new Error(`Failed to upload file: ${error.message}`);
    }
  }

  /**
   * Fájl letöltése a Supabase Storage-ből és mentése egy helyi útvonalra.
   * @param storagePath A letöltendő fájl elérési útja a bucket-ben.
   * @param localPath A helyi útvonal, ahova a fájlt menteni kell.
   */
  async downloadFile(storagePath: string, localPath: string): Promise<void> {
    try {
      console.log(`📥 Downloading ${storagePath} to ${localPath}`);
      const { data, error } = await supabase.storage
        .from(bucketName)
        .download(storagePath);

      if (error) {
        throw error;
      }

      if (!data) {
        throw new Error('No data received from storage.');
      }

      const buffer = Buffer.from(await data.arrayBuffer());
      
      const dir = path.dirname(localPath);
      await fs.mkdir(dir, { recursive: true });
      
      await fs.writeFile(localPath, buffer);
      console.log(`✅ File downloaded successfully to: ${localPath}`);
    } catch (error: any) {
      console.error(`❌ Download failed for ${storagePath}:`, error.message);
      throw new Error(`Failed to download file: ${error.message || 'Unknown error'}`);
    }
  }

  /**
   * VISSZAÁLLÍTOTT METÓDUS: Ez oldja meg a TS2339 build hibát.
   * Ellenőrzi, hogy egy fájl létezik-e a storage-ben anélkül, hogy letöltené.
   * @param storagePath A keresett fájl elérési útja.
   * @returns Igaz, ha a fájl létezik.
   */
  async fileExists(storagePath: string): Promise<boolean> {
    try {
      // A fájlokat a szülő mappájukban listázzuk
      const parentDir = path.dirname(storagePath);
      const fileName = path.basename(storagePath);

      const { data, error } = await supabase.storage
        .from(bucketName)
        .list(parentDir, {
          limit: 1, // Elég egyezést keresni
          search: fileName,
        });
      
      if (error) {
        // Hiba esetén (pl. mappa nem létezik) feltételezzük, hogy a fájl sem létezik
        return false;
      }

      return data.length > 0;
    } catch {
      return false;
    }
  }
  
  private async createBucketIfNotExists(): Promise<void> {
    const { data } = await supabase.storage.getBucket(bucketName);
    if (data) return;
    
    const { error } = await supabase.storage.createBucket(bucketName, { public: true });
    if (error) throw new Error(`Failed to create bucket "${bucketName}": ${error.message}`);
    console.log(`✅ Bucket "${bucketName}" created successfully.`);
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
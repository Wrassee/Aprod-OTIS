import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { promises as fs } from 'fs'; // Aszinkron fájlrendszer modul importálása
import path from 'path';

// Környezeti változók ellenőrzése
const supabaseUrl = process.env.VITE_SUPABASE_URL; // A VITE_ prefix a kliensoldal miatt kellhet, de szerveren is működik
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY; // A rövidebb, javasolt név
const bucketName = process.env.SUPABASE_BUCKET;

if (!supabaseUrl || !supabaseServiceKey || !bucketName) {
  throw new Error('Missing Supabase configuration. Please check VITE_SUPABASE_URL, SUPABASE_SERVICE_KEY, and SUPABASE_BUCKET environment variables.');
}

// Supabase kliens inicializálása
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
      
      const fileBuffer = await fs.readFile(filePath); // Aszinkron fájlolvasás
      
      const { error } = await supabase.storage
        .from(bucketName)
        .upload(storagePath, fileBuffer, {
          cacheControl: '3600',
          upsert: true, // Felülírja a fájlt, ha már létezik
          contentType: this.getContentType(storagePath)
        });

      if (error) {
        // Specifikus hibaellenőrzés, ha a bucket nem létezik
        if (error.message.includes('Bucket not found')) {
            console.warn(`Bucket "${bucketName}" not found. Attempting to create it...`);
            await this.createBucketIfNotExists();
            // Újrapróbálkozás a feltöltéssel a bucket létrehozása után
            return this.uploadFile(filePath, storagePath);
        }
        throw error; // Más hiba esetén dobja tovább
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
        throw error; // Az eredeti, részletesebb hibaobjektumot dobjuk tovább
      }

      if (!data) {
        throw new Error('No data received from storage.');
      }

      const buffer = Buffer.from(await data.arrayBuffer());
      
      const dir = path.dirname(localPath);
      await fs.mkdir(dir, { recursive: true }); // Aszinkron mappa létrehozás
      
      await fs.writeFile(localPath, buffer); // Aszinkron fájlírás
      console.log(`✅ File downloaded successfully to: ${localPath}`);
    } catch (error: any) {
      console.error(`❌ Download failed for ${storagePath}:`, error.message);
      // Itt az eredeti hibaobjektumot adjuk tovább, ami több információt tartalmazhat
      throw new Error(`Failed to download file: ${error.message || 'Unknown error'}`);
    }
  }

  /**
   * Fájl törlése a Supabase Storage-ből.
   * @param storagePath A törlendő fájl elérési útja.
   */
  async deleteFile(storagePath: string): Promise<void> {
    try {
      const { error } = await supabase.storage
        .from(bucketName)
        .remove([storagePath]);

      if (error) {
        throw error;
      }
      console.log(`✅ File deleted successfully: ${storagePath}`);
    } catch (error: any) {
      console.error(`❌ Delete failed for ${storagePath}:`, error.message);
      throw new Error(`Failed to delete file: ${error.message}`);
    }
  }
  
  /**
   * Ellenőrzi, hogy egy bucket létezik-e.
   * @returns Igaz, ha a bucket létezik.
   */
  private async bucketExists(): Promise<boolean> {
    const { data, error } = await supabase.storage.getBucket(bucketName);
    return !error && !!data;
  }

  /**
   * Létrehozza a konfigban megadott bucket-et, ha az még nem létezik.
   */
  async createBucketIfNotExists(): Promise<void> {
    if (await this.bucketExists()) {
        console.log(`Bucket "${bucketName}" already exists.`);
        return;
    }
    
    const { error } = await supabase.storage.createBucket(bucketName, {
      public: true, // Legyen publikus a könnyebb elérés érdekében
      allowedMimeTypes: ['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'image/*', 'application/pdf'],
    });

    if (error) {
      throw new Error(`Failed to create bucket "${bucketName}": ${error.message}`);
    }
    console.log(`✅ Bucket "${bucketName}" created successfully.`);
  }

  /**
   * Tartalomtípus meghatározása a fájlnév kiterjesztése alapján.
   * @param fileName A fájl neve.
   * @returns A MIME típus.
   */
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

// Singleton instance exportálása
export const supabaseStorage = new SupabaseStorageService();
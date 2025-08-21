import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const bucketName = process.env.SUPABASE_BUCKET!;

if (!supabaseUrl || !supabaseServiceKey || !bucketName) {
  console.error('Supabase config:', { 
    url: supabaseUrl ? 'Set' : 'Missing', 
    key: supabaseServiceKey ? `${supabaseServiceKey.substring(0, 10)}...` : 'Missing',
    bucket: bucketName ? 'Set' : 'Missing'
  });
  throw new Error('Missing Supabase configuration. Please check SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, and SUPABASE_BUCKET environment variables.');
}

console.log('Initializing Supabase client with URL:', supabaseUrl);
const supabase = createClient(supabaseUrl, supabaseServiceKey);

export class SupabaseStorageService {
  
  /**
   * Upload a file to Supabase Storage
   * @param filePath - Local file path to upload
   * @param storagePath - Path in storage bucket
   * @returns Public URL of uploaded file
   */
  async uploadFile(filePath: string, storagePath: string): Promise<string> {
    try {
      // Read file content
      const fileBuffer = fs.readFileSync(filePath);
      const fileName = path.basename(storagePath);
      
      // Upload to Supabase Storage
      const { data, error } = await supabase.storage
        .from(bucketName)
        .upload(storagePath, fileBuffer, {
          cacheControl: '3600',
          upsert: true,
          contentType: this.getContentType(fileName)
        });

      if (error) {
        throw new Error(`Failed to upload file: ${error.message}`);
      }

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from(bucketName)
        .getPublicUrl(storagePath);

      console.log(`✅ File uploaded successfully: ${publicUrl}`);
      return publicUrl;
    } catch (error) {
      console.error('❌ Upload failed:', error);
      throw error;
    }
  }

  /**
   * Download a file from Supabase Storage to local path
   * @param storagePath - Path in storage bucket
   * @param localPath - Local path to save file
   */
  async downloadFile(storagePath: string, localPath: string): Promise<void> {
    try {
      const { data, error } = await supabase.storage
        .from(bucketName)
        .download(storagePath);

      if (error) {
        throw new Error(`Failed to download file: ${error.message}`);
      }

      if (!data) {
        throw new Error('No data received from storage');
      }

      // Convert blob to buffer and save
      const arrayBuffer = await data.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      
      // Ensure directory exists
      const dir = path.dirname(localPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      
      fs.writeFileSync(localPath, buffer);
      console.log(`✅ File downloaded successfully: ${localPath}`);
    } catch (error) {
      console.error('❌ Download failed:', error);
      throw error;
    }
  }

  /**
   * Get public URL for a file in storage
   * @param storagePath - Path in storage bucket
   * @returns Public URL
   */
  getPublicUrl(storagePath: string): string {
    const { data: { publicUrl } } = supabase.storage
      .from(bucketName)
      .getPublicUrl(storagePath);
    
    return publicUrl;
  }

  /**
   * List files in a storage directory
   * @param prefix - Directory prefix to search
   * @returns Array of file objects
   */
  async listFiles(prefix: string = ''): Promise<any[]> {
    try {
      const { data, error } = await supabase.storage
        .from(bucketName)
        .list(prefix, {
          limit: 100,
          offset: 0
        });

      if (error) {
        throw new Error(`Failed to list files: ${error.message}`);
      }

      return data || [];
    } catch (error) {
      console.error('❌ List files failed:', error);
      throw error;
    }
  }

  /**
   * Delete a file from storage
   * @param storagePath - Path in storage bucket
   */
  async deleteFile(storagePath: string): Promise<void> {
    try {
      const { error } = await supabase.storage
        .from(bucketName)
        .remove([storagePath]);

      if (error) {
        throw new Error(`Failed to delete file: ${error.message}`);
      }

      console.log(`✅ File deleted successfully: ${storagePath}`);
    } catch (error) {
      console.error('❌ Delete failed:', error);
      throw error;
    }
  }

  /**
   * Check if a file exists in storage
   * @param storagePath - Path in storage bucket
   * @returns Boolean indicating if file exists
   */
  async fileExists(storagePath: string): Promise<boolean> {
    try {
      const { data, error } = await supabase.storage
        .from(bucketName)
        .download(storagePath);

      return !error && !!data;
    } catch {
      return false;
    }
  }

  /**
   * Get file info from storage
   * @param storagePath - Path in storage bucket
   * @returns File metadata
   */
  async getFileInfo(storagePath: string): Promise<any> {
    try {
      const files = await this.listFiles(path.dirname(storagePath));
      const fileName = path.basename(storagePath);
      
      return files.find(file => file.name === fileName);
    } catch (error) {
      console.error('❌ Get file info failed:', error);
      throw error;
    }
  }

  /**
   * Get content type based on file extension
   * @param fileName - Name of the file
   * @returns MIME type
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
      '.gif': 'image/gif',
      '.txt': 'text/plain',
      '.json': 'application/json'
    };
    
    return contentTypes[ext] || 'application/octet-stream';
  }
}

// Export singleton instance
export const supabaseStorage = new SupabaseStorageService();
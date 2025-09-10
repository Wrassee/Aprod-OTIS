import { storage } from '../storage.js';
import { supabaseStorage } from './supabase-storage.js';
import fs from 'fs';
import path from 'path';

/**
 * Helper service to load templates from Supabase Storage
 */
export class TemplateLoaderService {
  
  /**
   * Load template buffer from Supabase Storage
   * @param type - Template type (protocol, questions, etc.)
   * @param language - Language code or 'multilingual'
   * @returns Buffer with template data
   */
  async loadTemplateBuffer(type: string, language: string): Promise<Buffer> {
    // Try multilingual first, then language-specific
    let template = await storage.getActiveTemplate(type, 'multilingual');
    if (!template) {
      template = await storage.getActiveTemplate(type, language);
    }
    
    if (!template) {
      throw new Error(`No active ${type} template found for language: ${language}`);
    }

    // ⭐ JAVÍTÁS: Többféle property név támogatása debug-al
    console.log('🔍 Template object debug:', {
      id: template.id,
      name: template.name,
      filePath: template.filePath,
      file_path: template.file_path,
      fileName: template.fileName,
      file_name: template.file_name,
      allKeys: Object.keys(template)
    });

    const publicUrl = template.filePath || template.file_path;
    
    // ⭐ JAVÍTÁS: Ellenőrizzük hogy van-e publicUrl
    if (!publicUrl) {
      console.error('❌ No file path found in template:', template);
      throw new Error(`Template file path is missing for ${type} template: ${template.name}`);
    }

    console.log('📁 Using template file path:', publicUrl);
    
    // Check if it's a Supabase URL or local path (for backward compatibility)
    if (publicUrl.includes('supabase')) {
      return await this.downloadTemplateFromStorage(publicUrl, template.fileName || template.file_name || 'template.xlsx');
    } else {
      // Backward compatibility - read from local file
      // Check if file exists, if not try to use template from uploads directory
      if (fs.existsSync(publicUrl)) {
        return fs.readFileSync(publicUrl);
      } else {
        // Try to find a similar template in uploads directory
        const uploadsDir = path.join(process.cwd(), 'uploads');
        if (fs.existsSync(uploadsDir)) {
          const files = fs.readdirSync(uploadsDir);
          const protocolFile = files.find(f => f.includes('Abnahmeprotokoll') || f.includes('protocol'));
          if (protocolFile) {
            console.log(`Using fallback template: ${protocolFile}`);
            return fs.readFileSync(path.join(uploadsDir, protocolFile));
          }
        }
        throw new Error(`Template file not found: ${publicUrl}`);
      }
    }
  }

  /**
   * Download template from Supabase Storage to memory
   * @param publicUrl - Public URL from Supabase
   * @param fileName - Original filename for temp storage
   * @returns Buffer with template data
   */
  private async downloadTemplateFromStorage(publicUrl: string, fileName: string): Promise<Buffer> {
    try {
      console.log('🔗 Downloading from Supabase URL:', publicUrl);
      
      // ⭐ JAVÍTÁS: Supabase URL típusok kezelése
      let storagePath: string;
      
      if (publicUrl.startsWith('templates/')) {
        // Direct storage path
        storagePath = publicUrl;
      } else if (publicUrl.includes('/storage/v1/object/public/')) {
        // Extract storage path from public URL
        const urlParts = publicUrl.split('/');
        const bucketIndex = urlParts.indexOf('public') + 1;
        if (bucketIndex === 0 || bucketIndex >= urlParts.length) {
          throw new Error('Invalid storage URL format');
        }
        storagePath = urlParts.slice(bucketIndex + 1).join('/');
      } else if (publicUrl.includes('supabase')) {
        // Fallback - extract anything after templates/
        const templatesIndex = publicUrl.indexOf('templates/');
        if (templatesIndex !== -1) {
          storagePath = publicUrl.substring(templatesIndex);
        } else {
          throw new Error('Cannot extract storage path from Supabase URL');
        }
      } else {
        // Not a Supabase URL at all
        throw new Error('Not a valid Supabase storage URL');
      }
      
      console.log('📁 Extracted storage path:', storagePath);
      
      // Create temp directory - use /tmp for production
      const tempDir = process.env.NODE_ENV === 'production' ? '/tmp' : path.join(process.cwd(), 'temp');
      if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir, { recursive: true });
      }
      
      // Download to temp file
      const tempPath = path.join(tempDir, `template-${Date.now()}-${fileName}`);
      console.log('📥 Downloading to temp path:', tempPath);
      
      await supabaseStorage.downloadFile(storagePath, tempPath);
      console.log('✅ Download completed');
      
      // Read buffer and cleanup
      const buffer = fs.readFileSync(tempPath);
      console.log(`📦 Template loaded: ${buffer.length} bytes`);
      
      // Clean up temp file after a delay to allow processing
      setTimeout(() => {
        if (fs.existsSync(tempPath)) {
          fs.unlinkSync(tempPath);
          console.log('🧹 Temp file cleaned up:', tempPath);
        }
      }, 5000);
      
      return buffer;
    } catch (error) {
      console.error('Failed to download template from storage:', error);
      throw new Error(`Failed to load template: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Check if template exists in storage
   * @param type - Template type
   * @param language - Language code
   * @returns Boolean indicating if template exists
   */
  async templateExists(type: string, language: string): Promise<boolean> {
    try {
      const template = await storage.getActiveTemplate(type, language);
      if (!template) return false;

      const publicUrl = template.filePath || template.file_path;
      if (!publicUrl) return false;

      if (publicUrl.includes('supabase')) {
        // Extract storage path and check if file exists
        const urlParts = publicUrl.split('/');
        const bucketIndex = urlParts.indexOf('public') + 1;
        if (bucketIndex === 0 || bucketIndex >= urlParts.length) {
          return false;
        }
        
        const storagePath = urlParts.slice(bucketIndex + 1).join('/');
        return await supabaseStorage.fileExists(storagePath);
      } else {
        // Check local file
        return fs.existsSync(publicUrl);
      }
    } catch {
      return false;
    }
  }
}

// Export singleton instance
export const templateLoader = new TemplateLoaderService();
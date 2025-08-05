import fs from 'fs';
import path from 'path';
import { nanoid } from 'nanoid';

export class LocalFileService {
  private dataDir: string;
  private templatesDir: string;
  private protocolsDir: string;
  private errorsDir: string;
  private imagesDir: string;

  constructor() {
    this.dataDir = path.join(process.cwd(), 'data');
    this.templatesDir = path.join(this.dataDir, 'templates');
    this.protocolsDir = path.join(this.dataDir, 'protocols');
    this.errorsDir = path.join(this.dataDir, 'errors');
    this.imagesDir = path.join(this.dataDir, 'images');

    this.initializeDirectories();
  }

  private initializeDirectories() {
    const dirs = [this.dataDir, this.templatesDir, this.protocolsDir, this.errorsDir, this.imagesDir];
    
    dirs.forEach(dir => {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
        console.log(`Created directory: ${dir}`);
      }
    });
  }

  // Template file operations
  async saveTemplate(file: Express.Multer.File, type: string, language: string): Promise<string> {
    const fileId = nanoid();
    const extension = path.extname(file.originalname);
    const fileName = `${fileId}_${type}_${language}${extension}`;
    const filePath = path.join(this.templatesDir, fileName);

    // Copy file from upload location to templates directory
    fs.copyFileSync(file.path, filePath);
    
    // Clean up original uploaded file
    fs.unlinkSync(file.path);

    console.log(`Template saved locally: ${filePath}`);
    return filePath;
  }

  async getTemplate(filePath: string): Promise<Buffer> {
    if (!fs.existsSync(filePath)) {
      throw new Error(`Template file not found: ${filePath}`);
    }
    return fs.readFileSync(filePath);
  }

  async deleteTemplate(filePath: string): Promise<void> {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      console.log(`Template deleted: ${filePath}`);
    }
  }

  // Protocol file operations
  async saveProtocol(protocolData: any, format: 'excel' | 'pdf'): Promise<string> {
    const fileId = nanoid();
    const timestamp = new Date().toISOString().slice(0, 10);
    const fileName = `OTIS_Protocol_${timestamp}_${fileId}.${format === 'excel' ? 'xlsx' : 'pdf'}`;
    const filePath = path.join(this.protocolsDir, fileName);

    if (format === 'excel') {
      // Save Excel buffer
      fs.writeFileSync(filePath, protocolData);
    } else {
      // Save PDF buffer
      fs.writeFileSync(filePath, protocolData);
    }

    console.log(`Protocol saved locally: ${filePath}`);
    return filePath;
  }

  async getProtocol(filePath: string): Promise<Buffer> {
    if (!fs.existsSync(filePath)) {
      throw new Error(`Protocol file not found: ${filePath}`);
    }
    return fs.readFileSync(filePath);
  }

  // Error list file operations
  async saveErrorList(errorData: any, format: 'excel' | 'pdf'): Promise<string> {
    const fileId = nanoid();
    const timestamp = new Date().toISOString().slice(0, 10);
    const fileName = `OTIS_Errors_${timestamp}_${fileId}.${format === 'excel' ? 'xlsx' : 'pdf'}`;
    const filePath = path.join(this.errorsDir, fileName);

    fs.writeFileSync(filePath, errorData);

    console.log(`Error list saved locally: ${filePath}`);
    return filePath;
  }

  async getErrorList(filePath: string): Promise<Buffer> {
    if (!fs.existsSync(filePath)) {
      throw new Error(`Error list file not found: ${filePath}`);
    }
    return fs.readFileSync(filePath);
  }

  // Image file operations
  async saveImage(imageData: Buffer, originalName: string): Promise<string> {
    const fileId = nanoid();
    const extension = path.extname(originalName);
    const fileName = `${fileId}${extension}`;
    const filePath = path.join(this.imagesDir, fileName);

    fs.writeFileSync(filePath, imageData);

    console.log(`Image saved locally: ${filePath}`);
    return filePath;
  }

  async getImage(filePath: string): Promise<Buffer> {
    if (!fs.existsSync(filePath)) {
      throw new Error(`Image file not found: ${filePath}`);
    }
    return fs.readFileSync(filePath);
  }

  // Utility methods
  getFileStats(filePath: string): fs.Stats | null {
    try {
      return fs.statSync(filePath);
    } catch {
      return null;
    }
  }

  listFiles(directory: 'templates' | 'protocols' | 'errors' | 'images'): string[] {
    const dirPath = path.join(this.dataDir, directory);
    try {
      return fs.readdirSync(dirPath);
    } catch {
      return [];
    }
  }

  // Cleanup old files (older than specified days)
  cleanupOldFiles(directory: 'protocols' | 'errors', olderThanDays: number = 30): void {
    const dirPath = path.join(this.dataDir, directory);
    const cutoffTime = Date.now() - (olderThanDays * 24 * 60 * 60 * 1000);

    try {
      const files = fs.readdirSync(dirPath);
      let deletedCount = 0;

      files.forEach(file => {
        const filePath = path.join(dirPath, file);
        const stats = fs.statSync(filePath);
        
        if (stats.mtime.getTime() < cutoffTime) {
          fs.unlinkSync(filePath);
          deletedCount++;
        }
      });

      if (deletedCount > 0) {
        console.log(`Cleaned up ${deletedCount} old files from ${directory}`);
      }
    } catch (error) {
      console.error(`Error cleaning up ${directory}:`, error);
    }
  }
}

// Export singleton instance
export const localFileService = new LocalFileService();
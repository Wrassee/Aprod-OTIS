import { storage } from "../storage.js";
import * as XLSX from 'xlsx';

// Hardcoded fallback devices
const FALLBACK_GERMAN_DEVICES = [
  { id: 'device-1', name: 'Antriebsmotor' },
  { id: 'device-2', name: 'Türantriebsmotor' },
  { id: 'device-3', name: 'Lüfter' },
  { id: 'device-4', name: 'Beleuchtung Kabine' },
  { id: 'device-5', name: 'Beleuchtung Schacht' },
  { id: 'device-6', name: 'Notruf' },
  { id: 'device-7', name: 'Steuerung' },
  { id: 'device-8', name: 'Schützsteuerung' },
  { id: 'device-9', name: 'Frequenzumrichter' },
  { id: 'device-10', name: 'Bremse' },
  { id: 'device-11', name: 'Encoder' },
  { id: 'device-12', name: 'Sicherheitskette' },
  { id: 'device-13', name: 'Netzanschluss' }
];

const FALLBACK_HUNGARIAN_DEVICES = [
  { id: 'device-1', name: 'Motor vagy vezérlés' },
  { id: 'device-2', name: 'Ajtó motor' },
  { id: 'device-3', name: 'Ventilátor' },
  { id: 'device-4', name: 'Kabin világítás' },
  { id: 'device-5', name: 'Akna világítás' },
  { id: 'device-6', name: 'Vészhívó' },
  { id: 'device-7', name: 'Vezérlés' },
  { id: 'device-8', name: 'Kontaktor vezérlés' },
  { id: 'device-9', name: 'Frekvenciaváltó' },
  { id: 'device-10', name: 'Fék' },
  { id: 'device-11', name: 'Enkóder' },
  { id: 'device-12', name: 'Biztonsági lánc' },
  { id: 'device-13', name: 'Hálózati csatlakozás' }
];

export interface NiedervoltDevice {
  id: string;
  name: {
    de: string;
    hu: string;
  };
}

export class NiedervoltService {
  
  /**
   * Get niedervolt devices from Excel template with hardcoded fallback
   */
  async getNiedervoltDevices(): Promise<NiedervoltDevice[]> {
    try {
      // Try to get devices from active template
      const devices = await this.getDevicesFromTemplate();
      if (devices && devices.length > 0) {
        console.log('📊 Niedervolt devices loaded from Excel template:', devices.length);
        return devices;
      }
    } catch (error) {
      console.log('⚠️ Failed to load from Excel template, using hardcoded fallback:', error instanceof Error ? error.message : String(error));
    }
    
    // Fallback to hardcoded devices
    console.log('📋 Using hardcoded niedervolt devices fallback');
    return this.getHardcodedDevices();
  }

  /**
   * Get devices from active Excel template
   */
  private async getDevicesFromTemplate(): Promise<NiedervoltDevice[] | null> {
    const activeTemplate = await storage.getActiveTemplate('unified', 'multilingual') || 
                           await storage.getActiveTemplate('questions', 'multilingual');
    if (!activeTemplate) {
      return null;
    }

    // Read template file content
    const fs = await import('fs/promises');
    let templateBuffer: Buffer;
    try {
      templateBuffer = await fs.readFile(activeTemplate.filePath);
    } catch (error) {
      console.error('Failed to read template file:', error);
      return null;
    }

    try {
      const workbook = XLSX.read(templateBuffer, { type: 'buffer' });
      
      // Look for "Niedervolt" or "NIV" worksheet
      const niedervoltSheetName = workbook.SheetNames.find(name => 
        name.toLowerCase().includes('niedervolt') || 
        name.toLowerCase().includes('niv') ||
        name.toLowerCase().includes('messungen')
      );

      if (!niedervoltSheetName) {
        console.log('📄 No niedervolt worksheet found in template');
        return null;
      }

      const worksheet = workbook.Sheets[niedervoltSheetName];
      const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

      // Parse devices from worksheet
      const devices: NiedervoltDevice[] = [];
      let deviceIndex = 1;

      // Look for device data starting from row 2 (skip header)
      for (let i = 1; i < data.length; i++) {
        const row = data[i] as any[];
        if (!row || row.length < 2) continue;

        const germanName = row[0]?.toString()?.trim();
        const hungarianName = row[1]?.toString()?.trim();

        if (germanName && hungarianName) {
          devices.push({
            id: `device-${deviceIndex}`,
            name: {
              de: germanName,
              hu: hungarianName
            }
          });
          deviceIndex++;
        }
      }

      if (devices.length > 0) {
        console.log(`📊 Found ${devices.length} devices in Excel template`);
        return devices;
      }

      return null;
    } catch (error) {
      console.error('Error parsing niedervolt devices from template:', error);
      return null;
    }
  }

  /**
   * Get hardcoded devices as fallback
   */
  private getHardcodedDevices(): NiedervoltDevice[] {
    return FALLBACK_GERMAN_DEVICES.map((germanDevice, index) => ({
      id: germanDevice.id,
      name: {
        de: germanDevice.name,
        hu: FALLBACK_HUNGARIAN_DEVICES[index]?.name || germanDevice.name
      }
    }));
  }

  /**
   * Get dropdown options (these remain hardcoded for consistency)
   */
  getDropdownOptions() {
    return {
      sicherung: ['6A', '10A', '13A', '16A', '20A', '25A', '32A', '40A', '50A', '63A'],
      ls: ['B6', 'B10', 'B13', 'B16', 'B20', 'B25', 'B32', 'C6', 'C10', 'C13', 'C16', 'C20', 'C25', 'C32'],
      fiTest: ['OK', 'NOK']
    };
  }
}

export const niedervoltService = new NiedervoltService();
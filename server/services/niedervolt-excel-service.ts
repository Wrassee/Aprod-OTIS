import JSZip from 'jszip';
import fs from 'fs';
import { storage } from '.  //storage';
import { templateLoader } from './template-loader';

interface MeasurementRow {
  id: string;
  measurementType: string;
  description: string;
  value1: string;
  value2: string;
  value3: string;
  unit: string;
  notes: string;
}

interface NiedervoltExcelServiceOptions {
  measurements: MeasurementRow[];
  language: 'hu' | 'de';
}

export class NiedervoltExcelService {
  /**
   * Integrates Niedervolt measurements into OTIS Excel template starting from row 667
   */
  async integrateMeasurements({ measurements, language }: NiedervoltExcelServiceOptions): Promise<Buffer> {
    try {
      console.log(`NIEDERVOLT: Loading template via Supabase Storage for language: ${language}`);

      // Load template buffer via the new template loader
      const templateBuffer = await templateLoader.loadTemplateBuffer('protocol', language);
      console.log(`NIEDERVOLT: Using loaded template (${templateBuffer.length} bytes)`);
      
      // Load the Excel template using JSZip
      const zip = new JSZip();
      const workbook = await zip.loadAsync(templateBuffer);
      
      // Read the worksheet XML
      const worksheetFile = workbook.file('xl/worksheets/sheet1.xml');
      if (!worksheetFile) {
        throw new Error('Could not find main worksheet in template');
      }
      
      let worksheetXml = await worksheetFile.async('text');
      
      // Parse existing cells to find the insertion point (row 667)
      const startingRow = 667;
      let currentRow = startingRow;
      
      // Generate XML for measurement rows
      const measurementCells: string[] = [];
      
      measurements.forEach((measurement, index) => {
        const rowNum = currentRow + index;
        
        // Column mapping for Niedervolt measurements:
        // A: Measurement Type, B: Description, C: Value1, D: Value2, E: Value3, F: Unit, G: Notes
        const cells = [
          { col: 'A', value: this.getMeasurementTypeName(measurement.measurementType, language) },
          { col: 'B', value: measurement.description },
          { col: 'C', value: measurement.value1 },
          { col: 'D', value: measurement.value2 }, 
          { col: 'E', value: measurement.value3 },
          { col: 'F', value: measurement.unit },
          { col: 'G', value: measurement.notes }
        ];
        
        cells.forEach(cell => {
          if (cell.value && cell.value.trim()) {
            const cellRef = `${cell.col}${rowNum}`;
            const cellXml = this.createCellXml(cellRef, cell.value);
            measurementCells.push(cellXml);
          }
        });
      });
      
      // Insert the measurement cells into the worksheet XML
      if (measurementCells.length > 0) {
        const cellsToInsert = measurementCells.join('\n      ');
        
        // Find the sheetData closing tag and insert before it
        const sheetDataEndIndex = worksheetXml.lastIndexOf('</sheetData>');
        if (sheetDataEndIndex !== -1) {
          worksheetXml = worksheetXml.slice(0, sheetDataEndIndex) + 
                        '      ' + cellsToInsert + '\n    ' +
                        worksheetXml.slice(sheetDataEndIndex);
        }
      }
      
      // Update the worksheet in the zip
      zip.file('xl/worksheets/sheet1.xml', worksheetXml);
      
      console.log(`NIEDERVOLT: Integrated ${measurements.length} measurement rows starting from row ${startingRow}`);
      
      // Generate the updated Excel file
      const updatedBuffer = await zip.generateAsync({
        type: 'nodebuffer',
        compression: 'DEFLATE',
        compressionOptions: { level: 6 }
      });
      
      return updatedBuffer;
      
    } catch (error) {
      console.error('NIEDERVOLT ERROR:', error);
      throw new Error(`Failed to integrate Niedervolt measurements: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
  
  /**
   * Get localized measurement type name
   */
  private getMeasurementTypeName(typeId: string, language: 'hu' | 'de'): string {
    const types: Record<string, { hu: string; de: string }> = {
      'isolation': { hu: 'Isolationsmessung', de: 'Isolationsmessung' },
      'shortcircuit': { hu: 'Kurzschluss-strommessung', de: 'Kurzschluss-strommessung' },
      'voltage': { hu: 'Spannungsmessung', de: 'Spannungsmessung' },
      'continuity': { hu: 'Durchgangsprüfung', de: 'Durchgangsprüfung' },
      'insulation_resistance': { hu: 'Isolationswiderstand', de: 'Isolationswiderstand' },
      'earth_resistance': { hu: 'Erdungswiderstand', de: 'Erdungswiderstand' }
    };
    
    return types[typeId]?.[language] || typeId;
  }
  
  /**
   * Create Excel cell XML with proper formatting
   */
  private createCellXml(cellRef: string, value: string): string {
    // Determine if value is numeric
    const numericValue = parseFloat(value);
    const isNumeric = !isNaN(numericValue) && isFinite(numericValue);
    
    if (isNumeric) {
      // Numeric cell
      return `<c r="${cellRef}"><v>${numericValue}</v></c>`;
    } else {
      // Text cell - needs to be added to shared strings
      // For simplicity, we'll use inline string (less efficient but works)
      const escapedValue = value
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&apos;');
      
      return `<c r="${cellRef}" t="inlineStr"><is><t>${escapedValue}</t></is></c>`;
    }
  }
}

export const niedervoltExcelService = new NiedervoltExcelService();
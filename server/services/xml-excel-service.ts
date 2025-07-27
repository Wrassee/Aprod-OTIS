import JSZip from 'jszip';
import { XMLParser, XMLBuilder } from 'fast-xml-parser';
import * as fs from 'fs';
import { storage } from '../storage';
import type { FormData } from '../../client/src/lib/types';

// FormData interface imported from types

class XmlExcelService {
  private xmlParser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: '@_',
    textNodeName: '#text',
    parseAttributeValue: true,
    parseTagValue: true,
    trimValues: true
  });

  private xmlBuilder = new XMLBuilder({
    ignoreAttributes: false,
    attributeNamePrefix: '@_',
    textNodeName: '#text',
    suppressEmptyNode: true,
    processEntities: false
  });

  async generateExcelFromTemplate(formData: FormData, language: string): Promise<Buffer> {
    try {
      // Get the active protocol template
      const protocolTemplate = await storage.getActiveTemplate('protocol', language);
      
      if (!protocolTemplate) {
        throw new Error('No active protocol template found');
      }

      console.log(`Using protocol template: ${protocolTemplate.name} (${protocolTemplate.fileName})`);
      
      // Read template file
      const templateBuffer = fs.readFileSync(protocolTemplate.filePath);
      
      // Get question configs for cell mapping
      const questionsTemplate = await storage.getActiveTemplate('questions', language);
      let questionConfigs: any[] = [];
      
      if (questionsTemplate) {
        questionConfigs = await storage.getQuestionConfigsByTemplate(questionsTemplate.id);
        console.log('Loaded question configs:', questionConfigs.length);
      }

      // Process the Excel template with XML manipulation
      return await this.populateTemplateWithXml(templateBuffer, formData, questionConfigs, language);
      
    } catch (error) {
      console.error('Error generating Excel from template:', error);
      throw error;
    }
  }

  private async populateTemplateWithXml(
    templateBuffer: Buffer, 
    formData: FormData, 
    questionConfigs: any[], 
    language: string
  ): Promise<Buffer> {
    try {
      // Load the Excel file as a ZIP archive
      const zip = await JSZip.loadAsync(templateBuffer);
      
      // Find worksheet files (usually xl/worksheets/sheet1.xml, sheet2.xml, etc.)
      const worksheetFiles = Object.keys(zip.files).filter(name => 
        name.startsWith('xl/worksheets/') && name.endsWith('.xml')
      );
      
      if (worksheetFiles.length === 0) {
        throw new Error('No worksheet files found in Excel template');
      }

      // Process the first worksheet (assuming single sheet template)
      const sheetFile = worksheetFiles[0];
      console.log(`Processing worksheet: ${sheetFile}`);
      
      // Read the worksheet XML
      const worksheetXml = await zip.file(sheetFile)!.async('text');
      
      // Parse XML to object
      const worksheetObj = this.xmlParser.parse(worksheetXml);
      
      // Create cell mappings based on question configs
      const cellMappings = this.createCellMappings(formData, questionConfigs, language);
      
      // Update cell values in the worksheet object
      this.updateCellValues(worksheetObj, cellMappings);
      
      // Convert back to XML
      const updatedXml = this.xmlBuilder.build(worksheetObj);
      
      // Update the ZIP with modified worksheet
      zip.file(sheetFile, updatedXml);
      
      // Generate the final Excel buffer
      const result = await zip.generateAsync({ 
        type: 'nodebuffer',
        compression: 'DEFLATE',
        compressionOptions: { level: 6 }
      });
      
      console.log(`Successfully filled ${cellMappings.length} cells using XML manipulation`);
      return result;
      
    } catch (error) {
      console.error('Error in XML manipulation:', error);
      throw error;
    }
  }

  private createCellMappings(formData: FormData, questionConfigs: any[], language: string): any[] {
    const mappings: any[] = [];
    
    // Add answers based on question configs
    Object.entries(formData.answers).forEach(([questionId, answer]) => {
      const config = questionConfigs.find(q => q.questionId === questionId);
      
      if (config && config.cellReference && answer !== '' && answer !== null && answer !== undefined) {
        
        // Handle yes_no_na questions specially - put X in appropriate column
        if (config.type === 'yes_no_na') {
          console.log(`Processing yes_no_na question ${questionId}: ${answer}, cellRef: ${config.cellReference}`);
          
          const { row, col } = this.parseCellReference(config.cellReference);
          
          // Calculate A, B, C columns based on the base cell reference
          const baseColumnIndex = this.getColumnIndex(col);
          const aColumn = this.getColumnName(baseColumnIndex);     // A oszlop (igen)
          const bColumn = this.getColumnName(baseColumnIndex + 1); // B oszlop (nem)  
          const cColumn = this.getColumnName(baseColumnIndex + 2); // C oszlop (nem alkalmazható)
          
          console.log(`Column calculation: base=${col}(${baseColumnIndex}) -> A=${aColumn}, B=${bColumn}, C=${cColumn}`);
          
          // Add X to the appropriate column based on answer
          if (answer === 'yes') {
            console.log(`Adding X to YES column: ${aColumn}${row}`);
            mappings.push({
              cell: `${aColumn}${row}`,
              value: 'X',
              label: `${config.title} - Igen`
            });
          } else if (answer === 'no') {
            console.log(`Adding X to NO column: ${bColumn}${row}`);
            mappings.push({
              cell: `${bColumn}${row}`,
              value: 'X', 
              label: `${config.title} - Nem`
            });
          } else if (answer === 'na') {
            console.log(`Adding X to NA column: ${cColumn}${row}`);
            mappings.push({
              cell: `${cColumn}${row}`,
              value: 'X',
              label: `${config.title} - Nem alkalmazható`
            });
          }
        } else {
          // Handle other question types normally
          mappings.push({
            cell: config.cellReference,
            value: this.formatAnswer(answer, language),
            label: config.title || `Question ${questionId}`
          });
        }
      }
    });
    
    // Add signature name if available
    if (formData.signatureName && !mappings.find(m => m.cell === 'F9')) {
      mappings.push({
        cell: 'F9',
        value: formData.signatureName,
        label: 'Signature name'
      });
    }
    
    return mappings;
  }

  private updateCellValues(worksheetObj: any, cellMappings: any[]) {
    try {
      // Navigate to the worksheet data structure
      const worksheet = worksheetObj.worksheet;
      if (!worksheet) {
        throw new Error('Invalid worksheet structure - no worksheet found');
      }
      
      // Initialize sheetData if it doesn't exist
      if (!worksheet.sheetData) {
        worksheet.sheetData = { row: [] };
      }
      
      // Initialize rows array
      if (!worksheet.sheetData.row) {
        worksheet.sheetData.row = [];
      }
      
      const rows = Array.isArray(worksheet.sheetData.row) ? worksheet.sheetData.row : [worksheet.sheetData.row];
      
      cellMappings.forEach(mapping => {
        const { cell, value } = mapping;
        const { row: rowNum } = this.parseCellReference(cell);
        
        // Find or create the row
        let targetRow = rows.find((r: any) => r && r['@_r'] === rowNum);
        if (!targetRow) {
          targetRow = { '@_r': rowNum, c: [] };
          rows.push(targetRow);
        }
        
        // Ensure row.c is an array
        if (!targetRow.c) {
          targetRow.c = [];
        } else if (!Array.isArray(targetRow.c)) {
          targetRow.c = [targetRow.c];
        }
        
        // Find or create the cell
        let targetCell = targetRow.c.find((c: any) => c && c['@_r'] === cell);
        if (!targetCell) {
          targetCell = { '@_r': cell };
          targetRow.c.push(targetCell);
        }
        
        // Set cell value using inline string format for maximum compatibility
        targetCell['@_t'] = 'inlineStr';
        targetCell.is = { t: value };
        
        console.log(`XML: Set ${cell} = "${value}"`);
      });
      
      // Update the worksheet with modified rows
      worksheet.sheetData.row = rows;
      
    } catch (error) {
      console.error('Error updating cell values:', error);
      throw error;
    }
  }

  private parseCellReference(cellRef: string): { row: number, col: string } {
    const match = cellRef.match(/^([A-Z]+)(\d+)$/);
    if (!match) {
      throw new Error(`Invalid cell reference: ${cellRef}`);
    }
    
    return {
      row: parseInt(match[2], 10),
      col: match[1]
    };
  }

  // Convert column name (A, B, C, etc.) to index (0, 1, 2, etc.)
  private getColumnIndex(columnName: string): number {
    let index = 0;
    for (let i = 0; i < columnName.length; i++) {
      index = index * 26 + (columnName.charCodeAt(i) - 'A'.charCodeAt(0) + 1);
    }
    return index - 1;
  }

  // Convert column index (0, 1, 2, etc.) to name (A, B, C, etc.)
  private getColumnName(index: number): string {
    let columnName = '';
    while (index >= 0) {
      columnName = String.fromCharCode(index % 26 + 'A'.charCodeAt(0)) + columnName;
      index = Math.floor(index / 26) - 1;
    }
    return columnName;
  }

  private formatAnswer(value: any, language: string): string {
    if (typeof value === 'boolean') {
      return language === 'hu' ? (value ? 'Igen' : 'Nem') : (value ? 'Yes' : 'No');
    }
    
    if (value === 'yes') {
      return language === 'hu' ? 'Igen' : 'Yes';
    }
    
    if (value === 'no') {
      return language === 'hu' ? 'Nem' : 'No';
    }
    
    if (value === 'na') {
      return language === 'hu' ? 'N/A' : 'N/A';
    }
    
    return String(value);
  }
}

export const xmlExcelService = new XmlExcelService();
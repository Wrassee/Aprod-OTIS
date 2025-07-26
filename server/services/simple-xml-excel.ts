import JSZip from 'jszip';
import * as fs from 'fs';
import { storage } from '../storage';
import type { FormData } from '../../client/src/lib/types';

class SimpleXmlExcelService {
  async generateExcelFromTemplate(formData: FormData, language: string): Promise<Buffer> {
    try {
      // Get the active protocol template
      const protocolTemplate = await storage.getActiveTemplate('protocol', language);
      
      if (!protocolTemplate) {
        throw new Error('No active protocol template found');
      }

      console.log(`Using XML approach for template: ${protocolTemplate.name}`);
      
      // Read template file
      const templateBuffer = fs.readFileSync(protocolTemplate.filePath);
      
      // Get question configs for cell mapping
      const questionsTemplate = await storage.getActiveTemplate('questions', language);
      let questionConfigs: any[] = [];
      
      if (questionsTemplate) {
        questionConfigs = await storage.getQuestionConfigsByTemplate(questionsTemplate.id);
        console.log('Loaded question configs for XML:', questionConfigs.length);
      }

      // Process with simple string replacement in XML
      return await this.replaceInXmlArchive(templateBuffer, formData, questionConfigs, language);
      
    } catch (error) {
      console.error('XML Excel service error:', error);
      throw error;
    }
  }

  private async replaceInXmlArchive(
    templateBuffer: Buffer, 
    formData: FormData, 
    questionConfigs: any[], 
    language: string
  ): Promise<Buffer> {
    try {
      // Load the Excel file as a ZIP archive
      const zip = await JSZip.loadAsync(templateBuffer);
      
      // Create value mappings
      const cellMappings = this.createCellMappings(formData, questionConfigs, language);
      console.log('XML mappings created:', cellMappings.length);
      
      // Find and modify worksheet files
      const worksheetFiles = Object.keys(zip.files).filter(name => 
        name.startsWith('xl/worksheets/') && name.endsWith('.xml')
      );
      
      if (worksheetFiles.length === 0) {
        throw new Error('No worksheet files found in Excel template');
      }

      // Process the first worksheet
      const sheetFile = worksheetFiles[0];
      console.log(`Processing XML worksheet: ${sheetFile}`);
      
      // Read the worksheet XML as text
      let worksheetXml = await zip.file(sheetFile)!.async('text');
      
      // Perform direct text replacements for cell values while preserving formatting
      let totalModified = 0;
      cellMappings.forEach(mapping => {
        const { cell, value } = mapping;
        let cellModified = false;
        
        // Find any existing cell pattern for this cell - ONE SHOT approach
        const anyPattern = new RegExp(`<c r="${cell}"[^>]*>.*?</c>`);
        const anyMatch = worksheetXml.match(anyPattern);
        
        if (anyMatch && anyMatch[0]) {
          // Extract existing style if present
          const styleMatch = anyMatch[0].match(/s="([^"]+)"/);
          const styleAttr = styleMatch ? ` s="${styleMatch[1]}"` : '';
          
          // Replace the entire cell with new content - SINGLE replacement
          const replacement = `<c r="${cell}"${styleAttr} t="inlineStr"><is><t>${this.escapeXml(value)}</t></is></c>`;
          worksheetXml = worksheetXml.replace(anyMatch[0], replacement);
          cellModified = true;
          console.log(`XML: Updated ${cell} = "${value}"${styleAttr ? ' (style preserved)' : ''}`);
        } 
        // Only check for empty pattern if no existing cell found
        else if (worksheetXml.includes(`<c r="${cell}" s="`)) {
          const emptyPattern = new RegExp(`<c r="${cell}" s="([^"]+)"/>`);
          const emptyMatch = worksheetXml.match(emptyPattern);
          if (emptyMatch) {
            const styleValue = emptyMatch[1];
            const replacement = `<c r="${cell}" s="${styleValue}" t="inlineStr"><is><t>${this.escapeXml(value)}</t></is></c>`;
            worksheetXml = worksheetXml.replace(emptyMatch[0], replacement);
            cellModified = true;
            console.log(`XML: Filled empty ${cell} = "${value}" (s="${styleValue}")`);
          }
        }
        
        if (cellModified) {
          totalModified++;
        } else {
          console.log(`XML: Warning - Could not modify ${cell}`);
        }
      });
      
      console.log(`XML: Modified ${totalModified} cells`);
      
      // Update the ZIP with modified worksheet
      zip.file(sheetFile, worksheetXml);
      
      // Generate the final Excel buffer with UTF-8 encoding preservation
      const result = await zip.generateAsync({ 
        type: 'nodebuffer',
        compression: 'DEFLATE',
        compressionOptions: { level: 6 },
        streamFiles: false,
        platform: 'UNIX'
      });
      
      console.log(`XML Excel generation successful with ${totalModified} modifications`);
      return result;
      
    } catch (error) {
      console.error('Error in XML string replacement:', error);
      throw error;
    }
  }

  private createCellMappings(formData: FormData, questionConfigs: any[], language: string) {
    const mappings: Array<{cell: string, value: string, label: string}> = [];
    
    // Add answers based on question configs
    Object.entries(formData.answers).forEach(([questionId, answer]) => {
      const config = questionConfigs.find(q => q.questionId === questionId);
      
      if (config && config.cellReference && answer !== '' && answer !== null && answer !== undefined) {
        mappings.push({
          cell: config.cellReference,
          value: this.formatAnswer(answer, language),
          label: config.title || `Question ${questionId}`
        });
      }
    });
    
    // Add signature name if available and not conflicts
    if (formData.signatureName && !mappings.find(m => m.cell === 'F9')) {
      mappings.push({
        cell: 'F9',
        value: formData.signatureName,
        label: 'Signature name'
      });
    }
    
    return mappings;
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

  private inferCellStyle(cell: string, rowNumber: string | undefined): string {
    // Use actual OTIS template style indices discovered from XML analysis
    const cellStyleMap: Record<string, string> = {
      'F9': ' s="576"',   // Actual style from template
      'Q9': ' s="577"',   // Actual style from template  
      'G13': ' s="578"',  // Estimated based on pattern
      'Q13': ' s="579"',  // Estimated based on pattern
      'G14': ' s="580"',  // Estimated based on pattern
      'N14': ' s="581"',  // Estimated based on pattern
      'O16': ' s="582"',  // Estimated based on pattern
      'Q25': ' s="583"',  // Estimated based on pattern
      'A68': ' s="584"'   // Estimated based on pattern
    };
    
    // Return the specific style for this cell, or a reasonable default
    return cellStyleMap[cell] || ' s="576"'; // Default to F9 style
  }

  private escapeXml(text: string): string {
    // Proper XML escaping with Unicode preservation for Hungarian characters
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
    // Note: Hungarian characters like ű, ő, á, é, í, ó, ü, ý are preserved as-is
    // XML natively supports UTF-8 Unicode characters
  }
}

export const simpleXmlExcelService = new SimpleXmlExcelService();
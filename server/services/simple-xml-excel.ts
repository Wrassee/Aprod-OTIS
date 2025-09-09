// server/services/simple-xml-excel.ts
import JSZip from 'jszip';
import * as fs from 'fs';
import { storage } from '../storage.js';
import { templateLoader } from './template-loader.js';
import type { FormData } from '../../shared/types.js';

class SimpleXmlExcelService {
  async generateExcelFromTemplate(formData: FormData, language: string): Promise<Buffer> {
    try {
      console.log('XML: Loading protocol template via Supabase Storage...');
      
      const templateBuffer = await templateLoader.loadTemplateBuffer('protocol', language);
      console.log(`Using XML approach with loaded template (${templateBuffer.length} bytes)`);
      
      let questionsTemplate = await storage.getActiveTemplate('questions', 'multilingual');
      if (!questionsTemplate) {
        questionsTemplate = await storage.getActiveTemplate('unified', 'multilingual');
      }
      if (!questionsTemplate) {
        questionsTemplate = await storage.getActiveTemplate('questions', language);
      }
      if (!questionsTemplate) {
        questionsTemplate = await storage.getActiveTemplate('unified', language);
      }
      
      console.log('Questions template search result:', questionsTemplate ? `Found: ${questionsTemplate.name} (${questionsTemplate.language})` : 'NOT FOUND');
      
      let questionConfigs: any[] = [];
      
      if (questionsTemplate) {
        questionConfigs = await storage.getQuestionConfigsByTemplate(questionsTemplate.id);
        console.log('Loaded question configs for XML:', questionConfigs.length);
        console.log('Question config IDs:', questionConfigs.map(q => q.questionId));
      }

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
      const zip = await JSZip.loadAsync(templateBuffer);
      
      const cellMappings = this.createCellMappings(formData, questionConfigs, language);
      console.log('XML mappings created:', cellMappings.length);
      
      const worksheetFiles = Object.keys(zip.files).filter(name => 
        name.startsWith('xl/worksheets/') && name.endsWith('.xml')
      );
      
      if (worksheetFiles.length === 0) {
        throw new Error('No worksheet files found in Excel template');
      }

      const sheetFile = worksheetFiles[0];
      console.log(`Processing XML worksheet: ${sheetFile}`);
      
      let worksheetXml = await zip.file(sheetFile)!.async('text');
      
      let modifiedCount = 0;
      cellMappings.forEach(mapping => {
        const { cell, value } = mapping;
        
        const cellPattern = new RegExp(`(<c r="${cell}"[^>]*>)([^<]*)(</c>)`, 'g');
        const emptyPattern = new RegExp(`<c r="${cell}"([^>]*?)/>`, 'g');
        
        const cellExists = worksheetXml.includes(`r="${cell}"`);
        if (cellExists) {
          const cellMatch = worksheetXml.match(new RegExp(`<c r="${cell}"[^>]*>`));
          console.log(`XML Debug: ${cell} pattern:`, cellMatch ? cellMatch[0] : 'NOT_FOUND');
        }
        
        if (cellPattern.test(worksheetXml)) {
          worksheetXml = worksheetXml.replace(cellPattern, `$1<is><t>${this.escapeXml(value)}</t></is>$3`);
          modifiedCount++;
          console.log(`XML: Replaced ${cell} = "${value}" (formatting preserved)`);
        } 
        else if (worksheetXml.includes(`<c r="${cell}" s="`)) {
          const styleMatch = worksheetXml.match(new RegExp(`<c r="${cell}" s="([^"]+)"/>`));
          if (styleMatch) {
            const styleValue = styleMatch[1];
            const replacement = `<c r="${cell}" s="${styleValue}" t="inlineStr"><is><t>${this.escapeXml(value)}</t></is></c>`;
            worksheetXml = worksheetXml.replace(
              new RegExp(`<c r="${cell}" s="${styleValue}"/>`), 
              replacement
            );
            modifiedCount++;
            console.log(`XML: Added ${cell} = "${value}" (exact style preserved: s="${styleValue}")`);
          } else {
            console.log(`XML: Style match failed for ${cell}`);
          }
        }
        else if (emptyPattern.test(worksheetXml)) {
          const rowNum = cell.match(/\d+/)?.[0];
          const defaultStyle = this.inferCellStyle(cell, rowNum);
          
          worksheetXml = worksheetXml.replace(emptyPattern, 
            `<c r="${cell}"$1${defaultStyle} t="inlineStr"><is><t>${this.escapeXml(value)}</t></is></c>`);
          modifiedCount++;
          console.log(`XML: Added ${cell} = "${value}" (with inferred style)`);
        }
        else {
          const rowNumber = cell.match(/\d+/)?.[0];
          if (rowNumber) {
            const rowPattern = new RegExp(`(<row r="${rowNumber}"[^>]*>)(.*?)(</row>)`, 'g');
            if (rowPattern.test(worksheetXml)) {
              const defaultStyle = this.inferCellStyle(cell, rowNumber);
              worksheetXml = worksheetXml.replace(rowPattern, 
                `$1$2<c r="${cell}"${defaultStyle} t="inlineStr"><is><t>${this.escapeXml(value)}</t></is></c>$3`);
              modifiedCount++;
              console.log(`XML: Inserted ${cell} = "${value}" (with inferred style)`);
            }
          }
        }
      });
      
      console.log(`XML: Modified ${modifiedCount} cells`);
      
      zip.file(sheetFile, worksheetXml);
      
      const result = await zip.generateAsync({ 
        type: 'nodebuffer',
        compression: 'DEFLATE',
        compressionOptions: { level: 6 },
        streamFiles: false,
        platform: 'UNIX'
      });
      
      console.log(`XML Excel generation successful with ${modifiedCount} modifications`);
      return result;
      
    } catch (error) {
      console.error('Error in XML string replacement:', error);
      throw error;
    }
  }

  private createCellMappings(formData: FormData, questionConfigs: any[], language: string) {
    const mappings: Array<{cell: string, value: string, label: string}> = [];
    
    Object.entries(formData.answers).forEach(([questionId, answer]) => {
      const config = questionConfigs.find(q => q.questionId === questionId || q.questionId === String(questionId));
      
      console.log(`DEBUG: Processing question ${questionId}, config found:`, !!config, `answer:`, answer);
      if (!config) {
        console.log(`DEBUG: Available question IDs:`, questionConfigs.map(q => q.questionId));
      }
      
      if (config && config.cellReference && answer !== '' && answer !== null && answer !== undefined) {
        
        if (config.type === 'yes_no_na') {
          console.log(`Processing yes_no_na question ${questionId}: ${answer}, cellRef: ${config.cellReference}, multiCell: ${config.multiCell}`);
          
          const cellRefs = config.cellReference.split(',').map((cell: string) => cell.trim());
          
          if (cellRefs.length !== 3) {
            console.error(`Yes_no_na question ${questionId} must have exactly 3 cell references (A,B,C), got: ${cellRefs}`);
            mappings.push({
              cell: config.cellReference,
              value: this.formatAnswer(answer, language),
              label: config.title || `Question ${questionId}`
            });
            return;
          }
          
          const [yesCells, noCells, naCells] = cellRefs;
          
          if (config.multiCell) {
            console.log(`Multi-cell mode ENABLED for question ${questionId}`);
            
            const parseMultipleCells = (cellGroup: string): string[] => {
              return cellGroup.split(';').map(cell => cell.trim()).filter(cell => cell.length > 0);
            };
            
            const yesCellList = parseMultipleCells(yesCells);
            const noCellList = parseMultipleCells(noCells);
            const naCellList = parseMultipleCells(naCells);
            
            console.log(`Multi-cell mapping: YES=[${yesCellList.join(', ')}], NO=[${noCellList.join(', ')}], NA=[${naCellList.join(', ')}]`);
            
            if (answer === 'yes') {
              yesCellList.forEach(cell => {
                mappings.push({ cell, value: 'x', label: `${config.title} - Igen (${cell})` });
              });
            } else if (answer === 'no') {
              noCellList.forEach(cell => {
                mappings.push({ cell, value: 'x', label: `${config.title} - Nem (${cell})` });
              });
            } else if (answer === 'na') {
              naCellList.forEach(cell => {
                mappings.push({ cell, value: 'x', label: `${config.title} - Nem alkalmazható (${cell})` });
              });
            }
          } else {
            console.log(`Single-cell mode for question ${questionId}`);
            if (answer === 'yes') {
              mappings.push({ cell: yesCells, value: 'x', label: `${config.title} - Igen` });
            } else if (answer === 'no') {
              mappings.push({ cell: noCells, value: 'x', label: `${config.title} - Nem` });
            } else if (answer === 'na') {
              mappings.push({ cell: naCells, value: 'x', label: `${config.title} - Nem alkalmazható` });
            }
          }
        } 
        // --- JAVÍTÁS: A HIÁNYZÓ BLOKK VISSZAILLESZTVE ---
        else if (config.type === 'true_false') {
          let cellValue = '-'; // Alapértelmezett érték
          if (answer === 'true' || answer === true) {
            cellValue = 'X';
          }
          console.log(`Processing true_false question ${questionId}: ${answer} -> ${cellValue}, cellRef: ${config.cellReference}`);
          mappings.push({
            cell: config.cellReference,
            value: cellValue,
            label: config.title || `Question ${questionId}`
          });
        } 
        // --- JAVÍTÁS VÉGE ---
        else if (config.type === 'measurement') {
          const numValue = parseFloat(String(answer));
          if (!isNaN(numValue)) {
            mappings.push({
              cell: config.cellReference,
              value: String(numValue),
              label: config.title || `Question ${questionId}`
            });
          }
        } else if (config.type === 'calculated') {
          mappings.push({
            cell: config.cellReference,
            value: String(answer),
            label: config.title || `Question ${questionId}`
          });
        } else {
          mappings.push({
            cell: config.cellReference,
            value: this.formatAnswer(answer, language),
            label: config.title || `Question ${questionId}`
          });
        }
      }
    });
    
    if (formData.signatureName && !mappings.find(m => m.cell === 'F9')) {
      mappings.push({
        cell: 'F9',
        value: formData.signatureName,
        label: 'Signature name'
      });
    }

    if (formData.errors && formData.errors.length > 0) {
      console.log(`Adding ${formData.errors.length} errors starting from row 737`);
      
      formData.errors.forEach((error, index) => {
        const rowNumber = 737 + index;
        
        mappings.push({
          cell: `A${rowNumber}`,
          value: `${index + 1}`,
          label: `Error ${index + 1} number`
        });
        
        mappings.push({
          cell: `D${rowNumber}`,
          value: error.description || `Hiba ${index + 1}`,
          label: `Error ${index + 1} description`
        });
        
        const severityText = error.severity === 'critical' ? 'Kritikus' : 
                             error.severity === 'medium' ? 'Közepes' : 'Alacsony';
        mappings.push({
          cell: `K${rowNumber}`,
          value: severityText,
          label: `Error ${index + 1} severity`
        });
        
        console.log(`Error ${index + 1} mapped to row ${rowNumber}: A${rowNumber}=${index + 1}, D${rowNumber}=${error.description}, K${rowNumber}=${severityText}`);
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
    const cellStyleMap: Record<string, string> = {
      'F9': ' s="576"',
      'Q9': ' s="577"',
      'G13': ' s="578"',
      'Q13': ' s="579"',
      'G14': ' s="580"',
      'N14': ' s="581"',
      'O16': ' s="582"',
      'Q25': ' s="583"',
      'A68': ' s="584"'
    };
    
    return cellStyleMap[cell] || ' s="576"';
  }

  private escapeXml(text: string): string {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }
}

export const simpleXmlExcelService = new SimpleXmlExcelService();
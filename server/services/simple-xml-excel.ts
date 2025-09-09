// server/services/simple-xml-excel.ts
import JSZip from 'jszip';
import { storage } from '../storage.js';
import { templateLoader } from './template-loader.js';
import type { FormData } from '../../shared/types.js';

class SimpleXmlExcelService {
  async generateExcelFromTemplate(formData: FormData, language: string): Promise<Buffer> {
    try {
      console.log('XML: Loading protocol template...');
      const templateBuffer = await templateLoader.loadTemplateBuffer('protocol', language);
      console.log(`Using XML approach with loaded template (${templateBuffer.length} bytes)`);

      let questionsTemplate = await storage.getActiveTemplate('unified', 'multilingual');
      if (!questionsTemplate) {
        questionsTemplate = await storage.getActiveTemplate('questions', language);
      }
      
      let questionConfigs: any[] = [];
      if (questionsTemplate) {
        questionConfigs = await storage.getQuestionConfigsByTemplate(questionsTemplate.id);
        console.log(`Loaded ${questionConfigs.length} question configs for template.`);
      } else {
        console.warn('No active question template found!');
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
      console.log(`Created ${cellMappings.length} XML cell mappings.`);

      const sheetFile = Object.keys(zip.files).find(name => name.startsWith('xl/worksheets/') && name.endsWith('.xml'));
      if (!sheetFile) {
        throw new Error('No worksheet files found in Excel template');
      }

      let worksheetXml = await zip.file(sheetFile)!.async('text');
      let modifiedCount = 0;

      cellMappings.forEach(mapping => {
        const { cell, value } = mapping;
        const escapedValue = this.escapeXml(value);
        const cellPattern = new RegExp(`(<c r="${cell}"[^>]*>)(.*?)(</c>)`);
        const emptyCellPatternWithStyle = new RegExp(`<c r="${cell}"( s="[^"]+")/>`);

        let replaced = false;

        // Eset 1: Létező cella tartalommal
        if (cellPattern.test(worksheetXml)) {
          worksheetXml = worksheetXml.replace(cellPattern, `$1<is><t>${escapedValue}</t></is>$3`);
          replaced = true;
        }
        // Eset 2: Üres, de stílussal rendelkező cella (<c r="A1" s="1"/>)
        else if (emptyCellPatternWithStyle.test(worksheetXml)) {
          worksheetXml = worksheetXml.replace(emptyCellPatternWithStyle, `<c r="${cell}"$1 t="inlineStr"><is><t>${escapedValue}</t></is></c>`);
          replaced = true;
        }

        if (replaced) {
          console.log(`XML: Updated cell ${cell} with value "${value}"`);
          modifiedCount++;
        } else {
          console.warn(`XML: Could not find a pattern to replace for cell ${cell}.`);
        }
      });

      console.log(`XML: Modified ${modifiedCount} cells in total.`);
      zip.file(sheetFile, worksheetXml);

      return await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' });
    } catch (error) {
      console.error('Error in XML string replacement:', error);
      throw error;
    }
  }

  private createCellMappings(formData: FormData, questionConfigs: any[], language: string): Array<{cell: string, value: string, label: string}> {
    const mappings: Array<{cell: string, value: string, label: string}> = [];
    
    Object.entries(formData.answers).forEach(([questionId, answer]) => {
      
      // --- JAVÍTÁS: A questionId összehasonlítása stringként, hogy a "1" és 1 egyezzen. ---
      const config = questionConfigs.find(q => String(q.questionId) === questionId);

      if (!config) {
        console.log(`DEBUG: No config found for questionId: "${questionId}"`);
        return; // continue to next iteration
      }
      
      if (config.cellReference && answer !== null && answer !== undefined && answer !== '') {
        
        // HELYES LOGIKA: A rádiógombok (yes/no/na) kezelése
        if (config.type === 'yes_no_na' || config.type === 'radio') {
          console.log(`Processing radio question "${questionId}" (type: ${config.type}) with answer: "${answer}"`);
          const cellRefs = config.cellReference.split(',').map((c: string) => c.trim());
          const [yesCells, noCells, naCells] = cellRefs;

          const applyX = (cells: string) => {
            if (!cells) return;
            cells.split(';').map(c => c.trim()).filter(Boolean).forEach(cell => {
              mappings.push({ cell, value: 'x', label: `${config.title} (${answer})` });
            });
          };

          if (answer === 'yes') applyX(yesCells);
          else if (answer === 'no') applyX(noCells);
          else if (answer === 'na') applyX(naCells);
        } 
        // HELYES LOGIKA: A checkboxok (true/false) kezelése
        else if (config.type === 'true_false' || config.type === 'checkbox') {
          const cellValue = (answer === 'true' || answer === true) ? 'X' : '-';
          console.log(`Processing checkbox question "${questionId}" (type: ${config.type}): ${answer} -> ${cellValue}`);
          mappings.push({
            cell: config.cellReference,
            value: cellValue,
            label: config.title || `Question ${questionId}`
          });
        } 
        // Minden más típusú kérdés (szöveg, szám, stb.)
        else {
          mappings.push({
            cell: config.cellReference,
            value: String(answer),
            label: config.title || `Question ${questionId}`
          });
        }
      }
    });
    
    // Hibák hozzáadása az Excelhez
    if (formData.errors && formData.errors.length > 0) {
      formData.errors.forEach((error, index) => {
        const row = 737 + index;
        mappings.push({ cell: `A${row}`, value: `${index + 1}`, label: `Error Number` });
        mappings.push({ cell: `D${row}`, value: error.description, label: `Error Description` });
        const severity = error.severity === 'critical' ? 'Kritikus' : error.severity === 'medium' ? 'Közepes' : 'Alacsony';
        mappings.push({ cell: `K${row}`, value: severity, label: `Error Severity` });
      });
    }
    
    return mappings;
  }

  private escapeXml(text: string): string {
    if (typeof text !== 'string') {
        text = String(text);
    }
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }
}

export const simpleXmlExcelService = new SimpleXmlExcelService();
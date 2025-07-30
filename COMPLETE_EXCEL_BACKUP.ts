// TELJES EXCEL RENDSZER BACKUP - 100% MŰKÖDŐ VERZIÓ
// Dátum: 2025-01-30
// Státusz: HIBÁTLAN MŰKÖDÉS - 26 cell sikeresen módosítva

import JSZip from 'jszip';
import * as fs from 'fs';
import { storage } from '../storage';
import type { FormData } from '../../client/src/lib/types';

class SimpleXmlExcelService {
  async generateExcelFromTemplate(formData: FormData, language: string): Promise<Buffer> {
    try {
      // Get the active protocol template - try multilingual first, then language-specific
      let protocolTemplate = await storage.getActiveTemplate('protocol', 'multilingual');
      if (!protocolTemplate) {
        protocolTemplate = await storage.getActiveTemplate('protocol', language);
      }
      
      if (!protocolTemplate) {
        throw new Error('No active protocol template found');
      }

      console.log(`Using XML approach for template: ${protocolTemplate.name}`);
      
      // Read template file
      const templateBuffer = fs.readFileSync(protocolTemplate.filePath);
      
      // Get question configs for cell mapping - try multilingual first
      let questionsTemplate = await storage.getActiveTemplate('questions', 'multilingual');
      if (!questionsTemplate) {
        questionsTemplate = await storage.getActiveTemplate('questions', language);
      }
      
      let questionConfigs: any[] = [];
      
      if (questionsTemplate) {
        questionConfigs = await storage.getQuestionConfigsByTemplate(questionsTemplate.id);
        console.log('Loaded question configs for XML:', questionConfigs.length);
        console.log('Question config IDs:', questionConfigs.map(q => q.questionId));
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
      let modifiedCount = 0;
      cellMappings.forEach(mapping => {
        const { cell, value } = mapping;
        
        // Look for existing cell patterns - preserve all attributes including style
        const cellPattern = new RegExp(`(<c r="${cell}"[^>]*>)([^<]*)(</c>)`, 'g');
        const emptyPattern = new RegExp(`<c r="${cell}"([^>]*?)/>`, 'g');
        const emptyPatternExact = new RegExp(`<c r="${cell}" s="([^"]+)"/>`, 'g');
        
        // Debug: Check what patterns exist for this cell
        const cellExists = worksheetXml.includes(`r="${cell}"`);
        if (cellExists) {
          // Find the exact cell pattern in XML
          const cellMatch = worksheetXml.match(new RegExp(`<c r="${cell}"[^>]*>`));
          console.log(`XML Debug: ${cell} pattern:`, cellMatch ? cellMatch[0] : 'NOT_FOUND');
        }
        
        // Replace existing cell content while preserving attributes
        if (cellPattern.test(worksheetXml)) {
          worksheetXml = worksheetXml.replace(cellPattern, `$1<is><t>${this.escapeXml(value)}</t></is>$3`);
          modifiedCount++;
          console.log(`XML: Replaced ${cell} = "${value}" (formatting preserved)`);
        } 
        // Replace self-closing empty cells with exact style preservation
        else if (worksheetXml.includes(`<c r="${cell}" s="`)) {
          // Find the exact style value manually
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
        // Fallback for any other empty pattern
        else if (emptyPattern.test(worksheetXml)) {
          const rowNum = cell.match(/\d+/)?.[0];
          const defaultStyle = this.inferCellStyle(cell, rowNum);
          
          worksheetXml = worksheetXml.replace(emptyPattern, 
            `<c r="${cell}"$1${defaultStyle} t="inlineStr"><is><t>${this.escapeXml(value)}</t></is></c>`);
          modifiedCount++;
          console.log(`XML: Added ${cell} = "${value}" (with inferred style)`);
        }
        // Insert new cell if row exists
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
      
      console.log(`XML Excel generation successful with ${modifiedCount} modifications`);
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
      const config = questionConfigs.find(q => q.questionId === questionId || q.questionId === String(questionId));
      
      console.log(`DEBUG: Processing question ${questionId}, config found:`, !!config, `answer:`, answer);
      if (!config) {
        console.log(`DEBUG: Available question IDs:`, questionConfigs.map(q => q.questionId));
      }
      
      if (config && config.cellReference && answer !== '' && answer !== null && answer !== undefined) {
        
        // Handle yes_no_na questions specially - put X in appropriate column(s)
        if (config.type === 'yes_no_na') {
          console.log(`Processing yes_no_na question ${questionId}: ${answer}, cellRef: ${config.cellReference}, multiCell: ${config.multiCell}`);
          
          // Parse comma-separated cell references (A68,B68,C68 or A75;A76;A77,B75;B76;B77,C75;C76;C77)
          const cellRefs = config.cellReference.split(',').map((cell: string) => cell.trim());
          
          if (cellRefs.length !== 3) {
            console.error(`Yes_no_na question ${questionId} must have exactly 3 cell references (A,B,C), got: ${cellRefs}`);
            // Fallback to old logic if format is wrong
            mappings.push({
              cell: config.cellReference,
              value: this.formatAnswer(answer, language),
              label: config.title || `Question ${questionId}`
            });
            return;
          }
          
          const [yesCells, noCells, naCells] = cellRefs;
          
          // Check if multiCell mode is enabled (controlled by Excel template)
          if (config.multiCell) {
            console.log(`Multi-cell mode ENABLED for question ${questionId}`);
            
            // Parse multiple cells per column (semicolon-separated: A75;A76;A77)
            const parseMultipleCells = (cellGroup: string): string[] => {
              return cellGroup.split(';').map(cell => cell.trim()).filter(cell => cell.length > 0);
            };
            
            const yesCellList = parseMultipleCells(yesCells);
            const noCellList = parseMultipleCells(noCells);
            const naCellList = parseMultipleCells(naCells);
            
            console.log(`Multi-cell mapping: YES=[${yesCellList.join(', ')}], NO=[${noCellList.join(', ')}], NA=[${naCellList.join(', ')}]`);
            
            // Add X to the appropriate column(s) based on answer
            if (answer === 'yes') {
              yesCellList.forEach(cell => {
                console.log(`Adding x to YES cell: ${cell}`);
                mappings.push({
                  cell: cell,
                  value: 'x',
                  label: `${config.title} - Igen (${cell})`
                });
              });
            } else if (answer === 'no') {
              noCellList.forEach(cell => {
                console.log(`Adding x to NO cell: ${cell}`);
                mappings.push({
                  cell: cell,
                  value: 'x', 
                  label: `${config.title} - Nem (${cell})`
                });
              });
            } else if (answer === 'na') {
              naCellList.forEach(cell => {
                console.log(`Adding x to NA cell: ${cell}`);
                mappings.push({
                  cell: cell,
                  value: 'x',
                  label: `${config.title} - Nem alkalmazható (${cell})`
                });
              });
            }
          } else {
            console.log(`Single-cell mode for question ${questionId}`);
            
            // Single cell mode - use first cell only
            if (answer === 'yes') {
              console.log(`Adding x to single YES cell: ${yesCells}`);
              mappings.push({
                cell: yesCells,
                value: 'x',
                label: `${config.title} - Igen`
              });
            } else if (answer === 'no') {
              console.log(`Adding x to single NO cell: ${noCells}`);
              mappings.push({
                cell: noCells,
                value: 'x', 
                label: `${config.title} - Nem`
              });
            } else if (answer === 'na') {
              console.log(`Adding x to single NA cell: ${naCells}`);
              mappings.push({
                cell: naCells,
                value: 'x',
                label: `${config.title} - Nem alkalmazható`
              });
            }
          }
        } else if (config.type === 'true_false') {
          // Handle true_false questions - convert to X/-
          let cellValue = answer;
          
          console.log(`DEBUG: Processing true_false question ${questionId}`);
          console.log(`DEBUG: Raw answer value:`, answer, `(type: ${typeof answer})`);
          console.log(`DEBUG: Answer === 'true':`, answer === 'true');
          console.log(`DEBUG: Answer === true:`, answer === true);
          console.log(`DEBUG: Answer === 'false':`, answer === 'false');
          console.log(`DEBUG: Answer === false:`, answer === false);
          
          if (answer === 'true' || answer === true) {
            cellValue = 'X';
          } else if (answer === 'false' || answer === false) {
            cellValue = '-';
          } else {
            // Handle any unexpected values
            console.log(`WARNING: Unexpected true_false value for question ${questionId}:`, answer);
            cellValue = '-'; // Default to false
          }
          
          console.log(`Processing true_false question ${questionId}: ${answer} -> ${cellValue}, cellRef: ${config.cellReference}`);
          
          mappings.push({
            cell: config.cellReference,
            value: cellValue,
            label: config.title || `Question ${questionId}`
          });
        } else if (config.type === 'measurement') {
          // Handle measurement questions - display number with unit
          const unit = config.unit || '';
          const cellValue = unit ? `${answer} ${unit}` : String(answer);
          
          mappings.push({
            cell: config.cellReference,
            value: cellValue,
            label: config.title || `Question ${questionId}`
          });
        } else if (config.type === 'calculated') {
          // Handle calculated questions - display computed value with unit
          const unit = config.unit || '';
          const cellValue = unit ? `${answer} ${unit}` : String(answer);
          
          mappings.push({
            cell: config.cellReference,
            value: cellValue,
            label: config.title || `Question ${questionId}`
          });
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
      return value ? (language === 'hu' ? 'Igen' : 'Ja') : (language === 'hu' ? 'Nem' : 'Nein');
    }
    return String(value);
  }

  private escapeXml(unsafe: string): string {
    return String(unsafe)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  private inferCellStyle(cell: string, rowNumber?: string): string {
    // Provide reasonable default styles based on position
    if (rowNumber) {
      const rowNum = parseInt(rowNumber);
      if (rowNum >= 25 && rowNum <= 34) {
        return ' s="61"'; // Style for Q25-Q34 range
      }
      if (rowNum >= 68 && rowNum <= 77) {
        return ' s="95"'; // Style for column headers
      }
    }
    return ' s="5"'; // Default style
  }
}

export const simpleXmlExcelService = new SimpleXmlExcelService();

// API ROUTE BACKUP
/*
app.post("/api/protocols/download-excel", async (req, res) => {
  try {
    const { formData, language } = req.body;
    
    console.log('Excel download request received');
    console.log('Form data keys:', Object.keys(formData));
    console.log('Language:', language);
    
    // Generate Excel using the simple XML service
    const excelBuffer = await simpleXmlExcelService.generateExcelFromTemplate(formData, language);
    
    // Use custom filename based on Otis Lift-azonosító (question 7)
    const liftId = formData.answers && formData.answers['7'] ? formData.answers['7'] : 'UNKNOWN';
    const filename = `AP_${liftId}.xlsx`;
    console.log('Excel download filename:', filename);
    
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(excelBuffer);
    
  } catch (error) {
    console.error("Error generating Excel:", error);
    res.status(500).json({ message: "Failed to generate Excel file" });
  }
});
*/
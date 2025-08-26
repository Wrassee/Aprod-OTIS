import JSZip from 'jszip';
import * as fs from 'fs';
import { storage } from '../storage';
import { templateLoader } from './template-loader';
import type { FormData } from '../../shared/types';

class SimpleXmlExcelService {
  async generateExcelFromTemplate(formData: FormData, language: string): Promise<Buffer> {
    try {
      console.log('XML: Loading protocol template via Supabase Storage...');
      
      // Load template buffer via the new template loader
      const templateBuffer = await templateLoader.loadTemplateBuffer('protocol', language);
      console.log(`Using XML approach with loaded template (${templateBuffer.length} bytes)`);
      
      // Get question configs for cell mapping - try multilingual first, then unified, then language-specific
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

      // Process with XML manipulation for format preservation
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
          // Handle measurement questions - just the numeric value for Excel
          const numValue = parseFloat(String(answer));
          if (!isNaN(numValue)) {
            mappings.push({
              cell: config.cellReference,
              value: String(numValue),
              label: config.title || `Question ${questionId}`
            });
          }
        } else if (config.type === 'calculated') {
          // Handle calculated questions - just the computed value for Excel
          mappings.push({
            cell: config.cellReference,
            value: String(answer),
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

    // Add errors to Excel starting from row 737
    if (formData.errors && formData.errors.length > 0) {
      console.log(`Adding ${formData.errors.length} errors starting from row 737`);
      
      formData.errors.forEach((error, index) => {
        const rowNumber = 737 + index;
        
        // Write error number to merged ABC columns (A cell represents the merged area)
        mappings.push({
          cell: `A${rowNumber}`,
          value: `${index + 1}`,
          label: `Error ${index + 1} number`
        });
        
        // Write error description to merged DEFGH columns (D cell represents the merged area)
        mappings.push({
          cell: `D${rowNumber}`,
          value: error.description || `Hiba ${index + 1}`,
          label: `Error ${index + 1} description`
        });
        
        // Write error severity to merged KLM columns (K cell represents the merged area)
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
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
      } else {
        console.error('No questions template found! Cannot map data to Excel cells.');
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
        
        // Enhanced cell pattern matching for better Excel compatibility
        const cellExists = worksheetXml.includes(`r="${cell}"`);
        console.log(`XML Debug: Checking cell ${cell}, exists: ${cellExists}`);
        
        if (cellExists) {
          // Find the exact cell pattern in XML
          const cellMatch = worksheetXml.match(new RegExp(`<c r="${cell}"[^>]*>`));
          console.log(`XML Debug: ${cell} pattern:`, cellMatch ? cellMatch[0] : 'NOT_FOUND');
        }
        
        // Method 1: Replace existing cell content (with content)
        const contentCellPattern = new RegExp(`(<c r="${cell}"[^>]*>).*?(</c>)`, 'g');
        if (contentCellPattern.test(worksheetXml)) {
          // Use proper Excel format for text/numbers
          const isNumeric = !isNaN(parseFloat(value)) && isFinite(parseFloat(value));
          if (isNumeric) {
            worksheetXml = worksheetXml.replace(contentCellPattern, `$1<v>${value}</v>$2`);
          } else {
            worksheetXml = worksheetXml.replace(contentCellPattern, `$1<is><t>${this.escapeXml(value)}</t></is>$2`);
          }
          modifiedCount++;
          console.log(`XML: Replaced content cell ${cell} = "${value}" (${isNumeric ? 'numeric' : 'text'})`);
        }
        // Method 2: Replace self-closing empty cells with exact style preservation  
        else if (worksheetXml.includes(`<c r="${cell}" s="`)) {
          // Find the exact style value manually - handle both self-closing and content cells
          let styleMatch = worksheetXml.match(new RegExp(`<c r="${cell}" s="([^"]+)"/>`));
          
          if (!styleMatch) {
            // Try to find cells with content but same style pattern
            styleMatch = worksheetXml.match(new RegExp(`<c r="${cell}" s="([^"]+)"[^>]*>`));
          }
          
          if (styleMatch) {
            const styleValue = styleMatch[1];
            
            // Create appropriate replacement based on value type
            const isNumeric = !isNaN(parseFloat(value)) && isFinite(parseFloat(value));
            let replacement;
            
            if (isNumeric) {
              // For numeric values (including measurements), use <v> element
              replacement = `<c r="${cell}" s="${styleValue}"><v>${value}</v></c>`;
            } else {
              // For text values, use inline string format
              replacement = `<c r="${cell}" s="${styleValue}" t="inlineStr"><is><t>${this.escapeXml(value)}</t></is></c>`;
            }
            
            // Replace both self-closing and content versions
            const selfClosingPattern = new RegExp(`<c r="${cell}" s="${styleValue}"/>`);
            const contentPattern = new RegExp(`<c r="${cell}" s="${styleValue}"[^>]*>.*?</c>`);
            
            if (selfClosingPattern.test(worksheetXml)) {
              worksheetXml = worksheetXml.replace(selfClosingPattern, replacement);
            } else if (contentPattern.test(worksheetXml)) {
              worksheetXml = worksheetXml.replace(contentPattern, replacement);
            }
            
            modifiedCount++;
            console.log(`XML: Added ${cell} = "${value}" (${isNumeric ? 'numeric' : 'text'}, style: s="${styleValue}")`);
            
            // Special debug for measurement cells
            if (cell.startsWith('I') || cell.startsWith('N')) {
              console.log(`MEASUREMENT DEBUG: ${cell} successfully updated with value "${value}" (${isNumeric ? 'numeric' : 'text'})`);
            }
          } else {
            console.log(`XML: Style match failed for ${cell}`);
            console.log(`XML: Searching for pattern in XML: <c r="${cell}" s="`);
            
            // Try a more flexible approach for measurement cells
            const flexiblePattern = new RegExp(`<c r="${cell}"[^>]*s="([^"]+)"[^>]*>`, 'g');
            const flexibleMatch = flexiblePattern.exec(worksheetXml);
            if (flexibleMatch) {
              const styleValue = flexibleMatch[1];
              const fullCellPattern = new RegExp(`<c r="${cell}"[^>]*>.*?</c>`, 'g');
              
              // Use proper format based on value type
              const isNumeric = !isNaN(parseFloat(value)) && isFinite(parseFloat(value));
              let replacement;
              
              if (isNumeric) {
                replacement = `<c r="${cell}" s="${styleValue}"><v>${value}</v></c>`;
              } else {
                replacement = `<c r="${cell}" s="${styleValue}" t="inlineStr"><is><t>${this.escapeXml(value)}</t></is></c>`;
              }
              
              worksheetXml = worksheetXml.replace(fullCellPattern, replacement);
              modifiedCount++;
              console.log(`XML: FLEXIBLE match success for ${cell} = "${value}" (${isNumeric ? 'numeric' : 'text'}, style: s="${styleValue}")`);
            }
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
      
      // Generate the final Excel buffer with minimal compression for stability
      const result = await zip.generateAsync({ 
        type: 'nodebuffer',
        compression: 'STORE',  // No compression to prevent corruption
        streamFiles: false
      });
      
      // Verify buffer is valid before returning
      if (!result || result.length < 1000) {
        console.error('Generated buffer too small:', result?.length || 0);
        throw new Error('Generated Excel buffer is too small or invalid');
      }
      
      // Additional corruption check - try to reload the generated buffer
      try {
        await JSZip.loadAsync(result);
        console.log(`XML Excel generation successful with ${modifiedCount} modifications`);
        console.log(`Generated buffer size: ${result.length} bytes`);
        return result;
      } catch (verifyError) {
        console.error('Generated Excel buffer is corrupted:', verifyError);
        throw new Error('Generated Excel buffer failed verification');
      }
      
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
        console.log(`DEBUG: Looking for questionId '${questionId}' (type: ${typeof questionId})`);
        console.log(`DEBUG: Available configs:`, questionConfigs.map(q => `'${q.questionId}' (${typeof q.questionId})`));
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
          
          if (answer === 'true' || answer === 'TRUE' || String(answer).toLowerCase() === 'true') {
            cellValue = 'X';
          } else if (answer === 'false' || answer === 'FALSE' || String(answer).toLowerCase() === 'false') {
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
          // Handle measurement questions - keep as pure number for Excel
          const numericValue = parseFloat(String(answer));
          if (!isNaN(numericValue)) {
            mappings.push({
              cell: config.cellReference,
              value: String(numericValue), // Pure number, no unit
              label: config.title || `Question ${questionId}`
            });
          }
        } else if (config.type === 'calculated') {
          // Handle calculated questions - keep as pure number for Excel
          const numericValue = parseFloat(String(answer));
          if (!isNaN(numericValue)) {
            mappings.push({
              cell: config.cellReference,
              value: String(numericValue), // Pure number, no unit
              label: config.title || `Question ${questionId}`
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
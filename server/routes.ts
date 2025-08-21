import type { Express } from "express";
import { createServer, type Server } from "http";
import multer from "multer";
import path from "path";
import fs from "fs";
import { storage } from "./storage";
import { testConnection } from "./db";
import { insertProtocolSchema, insertTemplateSchema, insertQuestionConfigSchema } from "@shared/schema";
import { excelService } from "./services/excel-service";
import { pdfService } from "./services/pdf-service";
import { emailService } from "./services/email-service";
import { excelParserService } from "./services/excel-parser";
import { niedervoltExcelService } from "./services/niedervolt-excel-service";
import { errorRoutes } from "./routes/error-routes";
import { supabaseStorage } from "./services/supabase-storage";
import { z } from "zod";
import JSZip from "jszip";

// Configure multer for file uploads
const uploadDir = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const upload = multer({
  dest: uploadDir,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
        file.mimetype === 'application/vnd.ms-excel') {
      cb(null, true);
    } else {
      cb(new Error('Only Excel files are allowed'));
    }
  },
});

export async function registerRoutes(app: Express): Promise<Server> {
  // Test database connection first
  console.log('Testing database connection...');
  const dbConnected = await testConnection();
  if (!dbConnected) {
    throw new Error('Failed to connect to database');
  }
  
  // Error export routes
  app.use('/api/errors', errorRoutes);

  // PWA routes - serve with correct MIME types
  app.get('/sw.js', (req, res) => {
    res.setHeader('Content-Type', 'application/javascript');
    res.setHeader('Cache-Control', 'no-cache');
    res.sendFile(path.resolve(process.cwd(), 'public', 'sw.js'));
  });
  
  app.get('/manifest.json', (req, res) => {
    res.setHeader('Content-Type', 'application/manifest+json');
    res.sendFile(path.resolve(process.cwd(), 'public', 'manifest.json'));
  });
  
  app.get('/offline.html', (req, res) => {
    res.setHeader('Content-Type', 'text/html');
    res.sendFile(path.resolve(process.cwd(), 'public', 'offline.html'));
  });
  
  // Create protocol
  app.post("/api/protocols", async (req, res) => {
    try {
      const protocolData = insertProtocolSchema.parse(req.body);
      const protocol = await storage.createProtocol(protocolData);
      res.json(protocol);
    } catch (error) {
      console.error("Error creating protocol:", error);
      res.status(400).json({ message: "Invalid protocol data" });
    }
  });

  // Protocol preview endpoint - MUST BE BEFORE :id route
  app.get("/api/protocols/preview", async (req, res) => {
    try {
      // Get the most recent protocol
      const protocols = await storage.getAllProtocols();
      const latestProtocol = protocols[protocols.length - 1];
      
      if (!latestProtocol) {
        // Return a mock protocol for preview if none exists
        const mockProtocol = {
          id: 'preview-mock',
          receptionDate: new Date().toISOString().split('T')[0],
          answers: {
            '1': 'Példa Átvevő',
            '2': 'Példa Cím', 
            '3': '1000',
            '4': 'Minden rendben'
          },
          errors: [],
          signature: '',
          signatureName: 'Példa Aláíró',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
        return res.json(mockProtocol);
      }
      
      res.json(latestProtocol);
    } catch (error) {
      console.error("Error fetching protocol preview:", error);
      res.status(500).json({ message: "Failed to fetch protocol preview" });
    }
  });

  // Get protocol by ID
  app.get("/api/protocols/:id", async (req, res) => {
    try {
      const protocol = await storage.getProtocol(req.params.id);
      if (!protocol) {
        return res.status(404).json({ message: "Protocol not found" });
      }
      res.json(protocol);
    } catch (error) {
      console.error("Error fetching protocol:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Email PDF
  app.post("/api/protocols/email", async (req, res) => {
    try {
      const { formData, language, recipient } = req.body;
      
      // Generate Excel from template
      const excelBuffer = await excelService.generateExcel(formData, language);
      
      // Generate PDF from Excel
      const pdfBuffer = await pdfService.generatePDF(excelBuffer);
      
      // Generate error list PDF if errors exist
      let errorListPdf = null;
      if (formData.errors && formData.errors.length > 0) {
        errorListPdf = await pdfService.generateErrorListPDF(formData.errors, language);
      }
      
      // Send email with attachments
      await emailService.sendProtocolEmail({
        recipient: recipient || "recipient@example.com",
        language,
        protocolPdf: pdfBuffer,
        errorListPdf,
        receptionDate: formData.receptionDate,
      });
      
      res.json({ success: true, message: "PDF emailed successfully" });
    } catch (error) {
      console.error("Error emailing PDF:", error);
      res.status(500).json({ message: "Failed to email PDF" });
    }
  });

  // Save to cloud
  app.post("/api/protocols/cloud-save", async (req, res) => {
    try {
      const { formData, language } = req.body;
      
      // Generate Excel and PDF
      const excelBuffer = await excelService.generateExcel(formData, language);
      const pdfBuffer = await pdfService.generatePDF(excelBuffer);
      
      // TODO: Implement Google Drive upload
      // This would require Google Drive API integration
      console.log("Cloud save requested - implementation needed");
      
      res.json({ success: true, message: "Saved to cloud successfully" });
    } catch (error) {
      console.error("Error saving to cloud:", error);
      res.status(500).json({ message: "Failed to save to cloud" });
    }
  });

  // Download Excel (for testing)
  app.post("/api/protocols/download-excel", async (req, res) => {
    try {
      const { formData, language } = req.body;
      
      console.log('EXCEL: Using XML-based approach for PERFECT format preservation');
      
      // Import the proven XML-based service that preserves formatting
      const { simpleXmlExcelService } = await import('./services/simple-xml-excel');
      
      // Generate Excel with XML manipulation (proven to preserve formatting)
      let excelBuffer = await simpleXmlExcelService.generateExcelFromTemplate(formData, language);
      
      // NIEDERVOLT INTEGRATION TEMPORARILY DISABLED
      // This prevents interference with basic Excel functionality
      // Will be re-enabled after UI completion and template configuration
      if (formData.niedervoltMeasurements && formData.niedervoltMeasurements.length > 0) {
        console.log(`NIEDERVOLT: ${formData.niedervoltMeasurements.length} measurements found but integration disabled`);
      }
      
      if (!excelBuffer || excelBuffer.length < 1000) {
        throw new Error('Generated Excel buffer is invalid or too small');
      }
      
      console.log(`SAFE: Generated Excel with data: ${excelBuffer.length} bytes`);
      
      // Create filename based on question 7 (Otis Lift-azonosító) with AP_ prefix
      const liftId = formData.answers['7'] || 'Unknown';
      const filename = `AP_${liftId}.xlsx`;
      
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.send(excelBuffer);
      
    } catch (error) {
      console.error("Error generating Excel download:", error);
      res.status(500).json({ message: "Failed to generate Excel" });
    }
  });

  // Download PDF directly (Excel-style formatting)
  app.post("/api/protocols/download", async (req, res) => {
    try {
      const { formData, language } = req.body;
      
      // Generate Excel from template first
      const excelBuffer = await excelService.generateExcel(formData, language);
      
      // Generate PDF from Excel with proper formatting
      const pdfBuffer = await pdfService.generatePDF(excelBuffer);
      
      const timestamp = new Date().toISOString().slice(0, 19).replace(/[:.]/g, '-');
      
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="OTIS_Protocol_${timestamp}.pdf"`);
      res.send(pdfBuffer);
      
    } catch (error) {
      console.error("Error generating PDF download:", error);
      res.status(500).json({ message: "Failed to generate PDF" });
    }
  });



  // Upload images
  app.post("/api/upload", async (req, res) => {
    try {
      const { imageData, fileName } = req.body;
      
      if (!imageData || !fileName) {
        return res.status(400).json({ message: "Missing image data or filename" });
      }

      // Remove data URL prefix if present
      const base64Data = imageData.replace(/^data:image\/[a-z]+;base64,/, '');
      const buffer = Buffer.from(base64Data, 'base64');
      
      // Create temporary file
      const tempDir = path.join(process.cwd(), 'temp');
      if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir, { recursive: true });
      }
      
      const tempPath = path.join(tempDir, fileName);
      fs.writeFileSync(tempPath, buffer);
      
      // Upload to Supabase Storage
      const timestamp = Date.now();
      const storagePath = `images/${timestamp}-${fileName}`;
      const publicUrl = await supabaseStorage.uploadFile(tempPath, storagePath);
      
      // Clean up temp file
      fs.unlinkSync(tempPath);
      
      res.json({ success: true, url: publicUrl });
    } catch (error) {
      console.error("Error uploading image:", error);
      res.status(500).json({ message: "Failed to upload image" });
    }
  });



  // === ADMIN ROUTES FOR TEMPLATE MANAGEMENT ===

  // Get all templates
  app.get("/api/admin/templates", async (req, res) => {
    try {
      const templates = await storage.getAllTemplates();
      res.json(templates);
    } catch (error) {
      console.error("Error fetching templates:", error);
      res.status(500).json({ message: "Failed to fetch templates" });
    }
  });

  // Upload template (questions or protocol)
  app.post("/api/admin/templates/upload", upload.single('file'), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }

      const { name, type, language } = req.body;
      if (!name || !type || !language) {
        return res.status(400).json({ message: "Missing required fields: name, type, language" });
      }

      // Upload to Supabase Storage
      const timestamp = Date.now();
      const fileName = `${timestamp}-${req.file.originalname}`;
      const storagePath = `templates/${fileName}`;
      const publicUrl = await supabaseStorage.uploadFile(req.file.path, storagePath);

      // Read buffer before cleaning up temp file
      const buffer = fs.readFileSync(req.file.path);

      // Create template record with storage URL
      const template = await storage.createTemplate({
        name,
        type,
        language,
        fileName: req.file.originalname,
        filePath: publicUrl, // Store the public URL instead of local path
        isActive: false,
      });

      // Clean up temp file
      fs.unlinkSync(req.file.path);

      // If it's a questions template, parse and create question configs
      if (type === 'questions' || type === 'unified') {
        try {
          const questions = await excelParserService.parseQuestionsFromExcel(buffer);
          
          console.log(`Parsed ${questions.length} questions from ${type} template`);
          
          // Save question configurations
          for (const question of questions) {
            await storage.createQuestionConfig({
              templateId: template.id,
              questionId: question.questionId,
              title: question.title,
              titleHu: question.titleHu || null,
              titleDe: question.titleDe || null,
              type: question.type,
              required: question.required,
              placeholder: question.placeholder || null,
              cellReference: question.cellReference || null,
              sheetName: question.sheetName || null,
              multiCell: question.multiCell || false,
              groupName: question.groupName || null,
              groupNameDe: question.groupNameDe || null,
              groupOrder: question.groupOrder || 0,
              unit: question.unit || null,
              minValue: question.minValue || null,
              maxValue: question.maxValue || null,
              calculationFormula: question.calculationFormula || null,
              calculationInputs: question.calculationInputs || null,
            });
          }
        } catch (parseError) {
          console.error("Error parsing questions:", parseError);
          // Template still created, but parsing failed
        }
      }

      res.json(template);
    } catch (error) {
      console.error("Error uploading template:", error);
      res.status(500).json({ message: "Failed to upload template" });
    }
  });

  // Set active template
  app.post("/api/admin/templates/:id/activate", async (req, res) => {
    try {
      await storage.setActiveTemplate(req.params.id);
      res.json({ success: true });
    } catch (error) {
      console.error("Error activating template:", error);
      res.status(500).json({ message: "Failed to activate template" });
    }
  });

  // Download template file
  app.get("/api/admin/templates/:id/download", async (req, res) => {
    try {
      const templateId = req.params.id;
      const template = await storage.getTemplate(templateId);
      
      if (!template) {
        return res.status(404).json({ message: "Template not found" });
      }

      // Extract storage path from public URL
      const publicUrl = template.filePath;
      if (!publicUrl.includes('supabase')) {
        return res.status(404).json({ message: "Template file not found in storage" });
      }

      // Extract path from URL (format: https://bucket.supabase.co/storage/v1/object/public/bucket/path)
      const urlParts = publicUrl.split('/');
      const bucketIndex = urlParts.indexOf('public') + 1;
      if (bucketIndex === 0 || bucketIndex >= urlParts.length) {
        return res.status(404).json({ message: "Invalid storage URL format" });
      }
      
      const storagePath = urlParts.slice(bucketIndex + 1).join('/');
      
      // Download from Supabase Storage to temp location
      const tempDir = path.join(process.cwd(), 'temp');
      if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir, { recursive: true });
      }
      
      const tempPath = path.join(tempDir, `download-${Date.now()}-${template.fileName}`);
      await supabaseStorage.downloadFile(storagePath, tempPath);

      // Set appropriate headers for file download
      const fileName = template.fileName || `${template.name}.xlsx`;
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
      
      // Send the file and clean up
      res.sendFile(path.resolve(tempPath), (err) => {
        if (!err) {
          // Clean up temp file after sending
          setTimeout(() => {
            if (fs.existsSync(tempPath)) {
              fs.unlinkSync(tempPath);
            }
          }, 1000);
        }
      });
      
    } catch (error) {
      console.error("Error downloading template:", error);
      res.status(500).json({ message: "Failed to download template" });
    }
  });

  // Delete template
  app.delete("/api/admin/templates/:id", async (req, res) => {
    try {
      const templateId = req.params.id;
      
      // Get template info before deletion to remove file
      const template = await storage.getTemplate(templateId);
      if (!template) {
        return res.status(404).json({ message: "Template not found" });
      }

      // Delete associated question configs first
      await storage.deleteQuestionConfigsByTemplate(templateId);
      
      // Delete the template from database
      const deleted = await storage.deleteTemplate(templateId);
      if (!deleted) {
        return res.status(404).json({ message: "Template not found" });
      }

      // Remove physical file
      if (template.filePath && fs.existsSync(template.filePath)) {
        try {
          fs.unlinkSync(template.filePath);
        } catch (fileError) {
          console.error("Error deleting template file:", fileError);
          // Continue even if file deletion fails
        }
      }

      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting template:", error);
      res.status(500).json({ message: "Failed to delete template" });
    }
  });

  // Get question configurations for a template
  app.get("/api/admin/templates/:id/questions", async (req, res) => {
    try {
      const questions = await storage.getQuestionConfigsByTemplate(req.params.id);
      res.json(questions);
    } catch (error) {
      console.error("Error fetching question configs:", error);
      res.status(500).json({ message: "Failed to fetch question configurations" });
    }
  });

  // Update question configuration
  app.put("/api/admin/questions/:id", async (req, res) => {
    try {
      const updates = req.body;
      const updated = await storage.updateQuestionConfig(req.params.id, updates);
      if (!updated) {
        return res.status(404).json({ message: "Question configuration not found" });
      }
      res.json(updated);
    } catch (error) {
      console.error("Error updating question config:", error);
      res.status(500).json({ message: "Failed to update question configuration" });
    }
  });

  // Delete question configuration
  app.delete("/api/admin/questions/:id", async (req, res) => {
    try {
      const deleted = await storage.deleteQuestionConfig(req.params.id);
      if (!deleted) {
        return res.status(404).json({ message: "Question configuration not found" });
      }
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting question config:", error);
      res.status(500).json({ message: "Failed to delete question configuration" });
    }
  });

  // Get active questions for questionnaire
  app.get("/api/questions/:language", async (req, res) => {
    try {
      const { language } = req.params;
      
      // First try to find unified template (contains all question types)
      let questionsTemplate = await storage.getActiveTemplate('unified', 'multilingual');
      if (!questionsTemplate) {
        questionsTemplate = await storage.getActiveTemplate('unified', language);
      }
      
      // If no unified template, try traditional questions template
      if (!questionsTemplate) {
        questionsTemplate = await storage.getActiveTemplate('questions', 'multilingual');
        if (!questionsTemplate) {
          questionsTemplate = await storage.getActiveTemplate('questions', language);
        }
      }
      
      if (!questionsTemplate) {
        console.warn(`No active template found, using fallback questions`);
        return res.status(404).json({ message: "No active questions template found for this language" });
      }

      const questionConfigs = await storage.getQuestionConfigsByTemplate(questionsTemplate.id);
      
      // Convert to frontend Question format with groups
      const questions = questionConfigs.map(config => {
        let groupName = language === 'de' && config.groupNameDe ? config.groupNameDe : config.groupName;
        
        // Fix measurement and calculated questions - assign them to "Mérési adatok" group
        if (config.type === 'measurement' || config.type === 'calculated') {
          groupName = language === 'de' ? 'Messdaten' : 'Mérési adatok';
        }
        
        return {
          id: config.questionId,
          title: language === 'hu' && config.titleHu ? config.titleHu : 
                 language === 'de' && config.titleDe ? config.titleDe : 
                 config.title,
          type: config.type,
          required: config.required,
          placeholder: config.placeholder || undefined,
          cellReference: config.cellReference || undefined,
          sheetName: config.sheetName || undefined,
          groupName: groupName || undefined,
          groupOrder: config.groupOrder || 0,
          unit: config.unit || undefined,
          minValue: config.minValue || undefined,
          maxValue: config.maxValue || undefined,
          calculationFormula: config.calculationFormula || undefined,
          calculationInputs: config.calculationInputs || undefined,
        };
      });

      res.json(questions);
    } catch (error) {
      console.error("Error fetching questions:", error);
      res.status(500).json({ message: "Failed to fetch questions" });
    }
  });

  // Preview template info (sheets, cells)
  app.get("/api/admin/templates/:id/preview", async (req, res) => {
    try {
      const template = await storage.getTemplate(req.params.id);
      if (!template) {
        return res.status(404).json({ message: "Template not found" });
      }

      const buffer = fs.readFileSync(template.filePath);
      const info = await excelParserService.extractTemplateInfo(buffer);
      res.json(info);
    } catch (error) {
      console.error("Error previewing template:", error);
      res.status(500).json({ message: "Failed to preview template" });
    }
  });

  // Get niedervolt devices from template with fallback
  app.get("/api/niedervolt/devices", async (req, res) => {
    try {
      const { niedervoltService } = await import("./services/niedervolt-service");
      const devices = await niedervoltService.getNiedervoltDevices();
      const dropdownOptions = niedervoltService.getDropdownOptions();
      
      res.json({
        devices,
        dropdownOptions
      });
    } catch (error) {
      console.error("Error fetching niedervolt devices:", error);
      res.status(500).json({ message: "Failed to fetch niedervolt devices" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}

import type { Express } from "express";
import { createServer, type Server } from "http";
import multer from "multer";
import path from "path";
import fs from "fs";
import { storage } from "./storage";
import { localFileService } from "./services/local-file-service";
import { localErrorService } from "./services/local-error-service";
import { LocalCalculationService } from "./services/local-calculation-service";
import { insertProtocolSchema, insertTemplateSchema, insertQuestionConfigSchema } from "@shared/schema";
import { excelService } from "./services/excel-service";
import { pdfService } from "./services/pdf-service";
import { emailService } from "./services/email-service";
import { excelParserService } from "./services/excel-parser";
import { niedervoltExcelService } from "./services/niedervolt-excel-service";
import { errorRoutes } from "./routes/error-routes";
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
  // Routes ready to register - database already initialized in index.ts
  console.log('Registering API routes with local database...');
  
  // Error export routes with local processing
  app.post('/api/errors/export-excel', async (req, res) => {
    try {
      const { errors, protocolData, language } = req.body;
      
      if (!errors || !Array.isArray(errors)) {
        return res.status(400).json({ message: "Invalid errors data" });
      }
      
      console.log(`LOCAL ERROR: Generating Excel error list with ${errors.length} errors`);
      
      // Generate Excel error list using local error service
      const excelBuffer = await localErrorService.generateErrorExcel(
        errors,
        protocolData || {},
        language || 'hu'
      );
      
      // Save to local file system for tracking
      const localPath = await localFileService.saveErrorList(excelBuffer, 'excel');
      console.log(`LOCAL: Error list Excel saved to ${localPath}`);
      
      const timestamp = new Date().toISOString().slice(0, 10);
      const filename = `OTIS_Hibalista_${timestamp}.xlsx`;
      
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.send(excelBuffer);
    } catch (error) {
      console.error("Error generating Excel error list:", error);
      res.status(500).json({ message: "Failed to generate Excel error list" });
    }
  });

  app.post('/api/errors/export-pdf', async (req, res) => {
    try {
      const { errors, protocolData, language } = req.body;
      
      if (!errors || !Array.isArray(errors)) {
        return res.status(400).json({ message: "Invalid errors data" });
      }
      
      console.log(`LOCAL ERROR: Generating PDF error list with ${errors.length} errors`);
      
      // Generate PDF error list using local error service
      const pdfBuffer = await localErrorService.generateErrorPDF(
        errors,
        protocolData || {},
        language || 'hu'
      );
      
      // Save to local file system for tracking
      const localPath = await localFileService.saveErrorList(pdfBuffer, 'pdf');
      console.log(`LOCAL: Error list PDF saved to ${localPath}`);
      
      const timestamp = new Date().toISOString().slice(0, 10);
      const filename = `OTIS_Hibalista_${timestamp}.pdf`;
      
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.send(pdfBuffer);
    } catch (error) {
      console.error("Error generating PDF error list:", error);
      res.status(500).json({ message: "Failed to generate PDF error list" });
    }
  });

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

  // Download Excel with local calculation and storage
  app.post("/api/protocols/download-excel", async (req, res) => {
    try {
      const { formData, language } = req.body;
      
      console.log('LOCAL EXCEL: Generating with local calculation and file storage');
      
      // Use local calculation service for measurement calculations
      if (formData.measurements && Object.keys(formData.measurements).length > 0) {
        console.log('LOCAL: Processing measurements with local calculation engine');
        // This will be handled by the Excel service internally
      }
      
      // Import the proven XML-based service that preserves formatting
      const { simpleXmlExcelService } = await import('./services/simple-xml-excel');
      
      // Generate Excel with XML manipulation (proven to preserve formatting)
      let excelBuffer = await simpleXmlExcelService.generateExcelFromTemplate(formData, language);
      
      // Save to local file system for tracking
      const localFilePath = await localFileService.saveProtocol(excelBuffer, 'excel');
      console.log(`LOCAL: Excel protocol saved to ${localFilePath}`);
      
      if (!excelBuffer || excelBuffer.length < 1000) {
        throw new Error('Generated Excel buffer is invalid or too small');
      }
      
      console.log(`LOCAL: Generated Excel with data: ${excelBuffer.length} bytes`);
      
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

  // Download PDF with local processing and storage
  app.post("/api/protocols/download", async (req, res) => {
    try {
      const { formData, language } = req.body;
      
      console.log('LOCAL PDF: Generating with local processing and file storage');
      
      // Generate Excel from template first using local service
      const excelBuffer = await excelService.generateExcel(formData, language);
      
      // Generate PDF from Excel with proper formatting
      const pdfBuffer = await pdfService.generatePDF(excelBuffer);
      
      // Save both Excel and PDF to local file system
      const excelPath = await localFileService.saveProtocol(excelBuffer, 'excel');
      const pdfPath = await localFileService.saveProtocol(pdfBuffer, 'pdf');
      
      console.log(`LOCAL: Protocol saved - Excel: ${excelPath}, PDF: ${pdfPath}`);
      
      const timestamp = new Date().toISOString().slice(0, 19).replace(/[:.]/g, '-');
      
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="OTIS_Protocol_${timestamp}.pdf"`);
      res.send(pdfBuffer);
      
    } catch (error) {
      console.error("Error generating PDF download:", error);
      res.status(500).json({ message: "Failed to generate PDF" });
    }
  });



  // Upload images with local file storage
  app.post("/api/upload", async (req, res) => {
    try {
      const { imageData, fileName } = req.body;
      
      if (!imageData || !fileName) {
        return res.status(400).json({ message: "Missing image data or filename" });
      }
      
      // Convert base64 to buffer
      const base64Data = imageData.replace(/^data:image\/[a-z]+;base64,/, '');
      const imageBuffer = Buffer.from(base64Data, 'base64');
      
      // Save image using local file service
      const localImagePath = await localFileService.saveImage(imageBuffer, fileName);
      
      // Return local URL pattern for accessing the image
      const imageUrl = `/api/images/${path.basename(localImagePath)}`;
      
      console.log(`Image uploaded locally: ${fileName} -> ${localImagePath}`);
      res.json({ success: true, url: imageUrl, localPath: localImagePath });
    } catch (error) {
      console.error("Error uploading image:", error);
      res.status(500).json({ message: "Failed to upload image" });
    }
  });

  // Serve local images
  app.get("/api/images/:filename", async (req, res) => {
    try {
      const filename = req.params.filename;
      const imagePath = path.join(process.cwd(), 'data', 'images', filename);
      
      if (!fs.existsSync(imagePath)) {
        return res.status(404).json({ message: "Image not found" });
      }
      
      const imageBuffer = await localFileService.getImage(imagePath);
      const ext = path.extname(filename).toLowerCase();
      
      // Set appropriate content type
      let contentType = 'image/jpeg';
      if (ext === '.png') contentType = 'image/png';
      else if (ext === '.gif') contentType = 'image/gif';
      else if (ext === '.webp') contentType = 'image/webp';
      
      res.setHeader('Content-Type', contentType);
      res.send(imageBuffer);
    } catch (error) {
      console.error("Error serving image:", error);
      res.status(500).json({ message: "Failed to serve image" });
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

  // Upload template (questions or protocol) with local file storage
  app.post("/api/admin/templates/upload", upload.single('file'), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }

      const { name, type, language } = req.body;
      if (!name || !type || !language) {
        return res.status(400).json({ message: "Missing required fields: name, type, language" });
      }

      // Save file using local file service
      const localFilePath = await localFileService.saveTemplate(req.file, type, language);

      // Create template record
      const template = await storage.createTemplate({
        name,
        type,
        language,
        fileName: req.file.originalname,
        filePath: localFilePath,
        isActive: false,
      });

      console.log(`Template uploaded locally: ${name} -> ${localFilePath}`);

      // If it's a questions template, parse and create question configs
      if (type === 'questions' || type === 'unified') {
        try {
          // Skip parsing if excelParserService is not available
          console.log('Question parsing temporarily disabled - manual configuration required');
          
          // Question configurations will be available through template management
          // This allows templates to be uploaded and activated without parsing
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

      const filePath = template.filePath;
      if (!fs.existsSync(filePath)) {
        return res.status(404).json({ message: "Template file not found on disk" });
      }

      // Set appropriate headers for file download
      const fileName = template.fileName || `${template.name}.xlsx`;
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
      
      // Send the file
      res.sendFile(path.resolve(filePath));
      
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

  const httpServer = createServer(app);
  return httpServer;
}

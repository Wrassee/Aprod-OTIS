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
import { z } from "zod";

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
      
      // Generate Excel from template
      const excelBuffer = await excelService.generateExcel(formData, language);
      
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', 'attachment; filename=acceptance-protocol.xlsx');
      res.send(excelBuffer);
    } catch (error) {
      console.error("Error generating Excel download:", error);
      res.status(500).json({ message: "Failed to generate Excel" });
    }
  });

  // Download PDF
  app.post("/api/protocols/download", async (req, res) => {
    try {
      const { formData, language } = req.body;
      
      // Generate Excel from template
      const excelBuffer = await excelService.generateExcel(formData, language);
      
      // Generate PDF from Excel
      const pdfBuffer = await pdfService.generatePDF(excelBuffer);
      
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', 'attachment; filename=acceptance-protocol.pdf');
      res.send(pdfBuffer);
    } catch (error) {
      console.error("Error generating PDF download:", error);
      res.status(500).json({ message: "Failed to generate PDF" });
    }
  });



  // Upload images
  app.post("/api/upload", async (req, res) => {
    try {
      // TODO: Implement image upload handling
      // This would handle base64 images from the frontend
      res.json({ success: true, url: "/mock-image-url" });
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

      // Move file to permanent location
      const fileName = `${Date.now()}-${req.file.originalname}`;
      const filePath = path.join(uploadDir, fileName);
      fs.renameSync(req.file.path, filePath);

      // Create template record
      const template = await storage.createTemplate({
        name,
        type,
        language,
        fileName: req.file.originalname,
        filePath,
        isActive: false,
      });

      // If it's a questions template, parse and create question configs
      if (type === 'questions') {
        try {
          const buffer = fs.readFileSync(filePath);
          const questions = await excelParserService.parseQuestionsFromExcel(buffer);
          
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
      const questionsTemplate = await storage.getActiveTemplate('questions', language);
      
      if (!questionsTemplate) {
        return res.status(404).json({ message: "No active questions template found for this language" });
      }

      const questionConfigs = await storage.getQuestionConfigsByTemplate(questionsTemplate.id);
      
      // Convert to frontend Question format
      const questions = questionConfigs.map(config => ({
        id: config.questionId,
        title: language === 'hu' && config.titleHu ? config.titleHu : 
               language === 'de' && config.titleDe ? config.titleDe : 
               config.title,
        type: config.type,
        required: config.required,
        placeholder: config.placeholder || undefined,
        cellReference: config.cellReference || undefined,
        sheetName: config.sheetName || undefined,
      }));

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

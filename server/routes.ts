import type { Express } from "express";
import { createServer, type Server } from "http";
import multer from "multer";
import express from "express";
import path from "path";
import fs from "fs";
// --- JAVÍTOTT IMPORTOK ---
import { storage } from "./storage.js";
import { testConnection } from "./db.js";
import { insertProtocolSchema, insertTemplateSchema, insertQuestionConfigSchema } from "../shared/schema.js"; 
import { excelService } from "./services/excel-service.js";
import { pdfService } from "./services/pdf-service.js";
import { emailService } from "./services/email-service.js";
import { excelParserService } from "./services/excel-parser.js";
import { niedervoltExcelService } from "./services/niedervolt-excel-service.js";
import { errorRoutes } from "./routes/error-routes.js";
import { supabaseStorage } from "./services/supabase-storage.js";
// --- JAVÍTÁSOK VÉGE ---
import { z } from "zod";
import JSZip from "jszip";

// JAVÍTVA: Környezetfüggő feltöltési mappa, ami a Vercelen és localhoston is működik
const uploadDir = process.env.NODE_ENV === 'production'
  ? '/tmp'
  : path.join(process.cwd(), 'uploads');

if (process.env.NODE_ENV !== 'production' && !fs.existsSync(uploadDir)) {
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
  const dbConnected = await testConnection();
  if (!dbConnected) {
    throw new Error('Failed to connect to database');
  }

  // JAVÍTVA: Az Express szolgálja ki a public mappát, hogy a logó biztosan működjön
  app.use(express.static(path.join(process.cwd(), 'public')));
  
  app.use('/api/errors', errorRoutes);
  
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
      const excelBuffer = await excelService.generateExcel(formData, language);
      const pdfBuffer = await pdfService.generatePDF(excelBuffer);
      let errorListPdf = null;
      if (formData.errors && formData.errors.length > 0) {
        errorListPdf = await pdfService.generateErrorListPDF(formData.errors, language);
      }
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

  // Download Excel
  app.post("/api/protocols/download-excel", async (req, res) => {
    try {
      const { formData, language } = req.body;
      const { simpleXmlExcelService } = await import('./services/simple-xml-excel.js');
      const excelBuffer = await simpleXmlExcelService.generateExcelFromTemplate(formData, language);
      if (!excelBuffer || excelBuffer.length < 1000) {
        throw new Error('Generated Excel buffer is invalid or too small');
      }
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

  // Upload images to Supabase Storage
  app.post("/api/upload", async (req, res) => {
    try {
      const { imageData, fileName } = req.body;
      if (!imageData || !fileName) {
        return res.status(400).json({ message: "Missing image data or filename" });
      }
      const base64Data = imageData.replace(/^data:image\/[a-z]+;base64,/, '');
      const buffer = Buffer.from(base64Data, 'base64');
      const tempPath = path.join('/tmp', fileName);
      fs.writeFileSync(tempPath, buffer);
      
      const timestamp = Date.now();
      const storagePath = `images/${timestamp}-${fileName}`;
      const publicUrl = await supabaseStorage.uploadFile(tempPath, storagePath);
      
      fs.unlinkSync(tempPath);
      
      res.json({ success: true, url: publicUrl });
    } catch (error) {
      console.error("Error uploading image:", error);
      res.status(500).json({ message: "Failed to upload image" });
    }
  });

  // === ADMIN ROUTES ===
  app.get("/api/admin/templates", async (req, res) => {
    try {
      const templates = await storage.getAllTemplates();
      res.json(templates);
    } catch (error) {
      console.error("Error fetching templates:", error);
      res.status(500).json({ message: "Failed to fetch templates" });
    }
  });

  app.post("/api/admin/templates/upload", upload.single('file'), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }
      const { name, type, language } = req.body;
      if (!name || !type || !language) {
        fs.unlinkSync(req.file.path);
        return res.status(400).json({ message: "Missing required fields: name, type, language" });
      }

      const timestamp = Date.now();
      const fileName = `${timestamp}-${req.file.originalname}`;
      const storagePath = `templates/${fileName}`;
      
      const publicUrl = await supabaseStorage.uploadFile(req.file.path, storagePath);
      
      const newTemplate = await storage.createTemplate({
        name,
        type,
        language,
        fileName: req.file.originalname,
        filePath: publicUrl,
        isActive: false,
      });

      if (fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }
      
      res.json(newTemplate);
    } catch (error) {
      console.error("Error uploading template:", error);
      res.status(500).json({ message: "Failed to upload template" });
    }
  });

  app.post("/api/admin/templates/:id/activate", async (req, res) => {
    try {
      await storage.setActiveTemplate(req.params.id);
      res.json({ success: true });
    } catch (error) {
      console.error("Error activating template:", error);
      res.status(500).json({ message: "Failed to activate template" });
    }
  });

  // Get active questions for questionnaire
  app.get("/api/questions/:language", async (req, res) => {
    try {
      const { language } = req.params;
      let questionsTemplate;
      const typesToTry = ['unified', 'questions'];
      const languagesToTry = ['multilingual', language];

      for (const type of typesToTry) {
        for (const lang of languagesToTry) {
          questionsTemplate = await storage.getActiveTemplate(type, lang);
          if (questionsTemplate) break;
        }
        if (questionsTemplate) break;
      }
      
      if (!questionsTemplate) {
        console.warn(`No active template found for language ${language}.`);
        return res.status(404).json({ message: "No active questions template found" });
      }
      
      // --- JAVÍTVA: A sablon letöltésének és feldolgozásának logikája ---
      const filePath = questionsTemplate.filePath;
      if (!filePath || !filePath.startsWith('http')) {
        throw new Error("Template file path is not a valid Supabase URL.");
      }

      const tempPath = path.join('/tmp', `template-${Date.now()}-${questionsTemplate.fileName}`);
      
      const urlParts = filePath.split('/');
      const storagePathIndex = urlParts.findIndex(part => part === 'object') + 2;
      const storagePath = urlParts.slice(storagePathIndex).join('/');
      
      await supabaseStorage.downloadFile(storagePath, tempPath);
      const templateBuffer = fs.readFileSync(tempPath);
      const questions = await excelParserService.parseQuestionsFromExcel(templateBuffer);
      fs.unlinkSync(tempPath);
      // --- JAVÍTÁS VÉGE ---

      const formattedQuestions = questions.map(config => {
        let groupName = (language === 'de' && config.groupNameDe) ? config.groupNameDe : config.groupName;
        if (config.type === 'measurement' || config.type === 'calculated') {
          groupName = language === 'de' ? 'Messdaten' : 'Mérési adatok';
        }
        return {
          id: config.questionId,
          title: (language === 'hu' && config.titleHu) ? config.titleHu : 
                 (language === 'de' && config.titleDe) ? config.titleDe : 
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

      res.json(formattedQuestions);
    } catch (error) {
      console.error("Error fetching questions:", error);
      res.status(500).json({ message: "Failed to fetch questions" });
    }
  });

  // Get niedervolt devices from template with fallback
  app.get("/api/niedervolt/devices", async (req, res) => {
    try {
      const { niedervoltService } = await import("./services/niedervolt-service.js");
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
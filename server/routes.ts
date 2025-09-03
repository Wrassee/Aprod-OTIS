import type { Express } from "express";
import { createServer, type Server } from "http";
import multer from "multer";
import express from "express";
import path from "path";
import * as fs from "fs";

import { storage } from "./storage.js";
import { testConnection } from "./db.js";
import { insertProtocolSchema } from "../shared/schema.js"; 
import { excelService } from "./services/excel-service.js";
import { pdfService } from "./services/pdf-service.js";
import { emailService } from "./services/email-service.js";
import { excelParserService } from "./services/excel-parser.js";
import { errorRoutes } from "./routes/error-routes.js";
import { supabaseStorage } from "./services/supabase-storage.js";

// Feltöltési mappa
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
    if (
      file.mimetype === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
      file.mimetype === 'application/vnd.ms-excel'
    ) {
      cb(null, true);
    } else {
      cb(new Error('Only Excel files are allowed'));
    }
  },
});

export async function registerRoutes(app: Express): Promise<Server> {
  await testConnection();

  // ✅ Frontend dist kiszolgálása
  app.use(express.static(path.join(process.cwd(), "dist")));

  // ✅ Root/public kiszolgálása (pl. otis-logo.png)
  app.use(express.static(path.join(process.cwd(), "public")));

  // Error routes
  app.use("/api/errors", errorRoutes);

  // Protocol létrehozása
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

  // Kérdések lekérése
  app.get("/api/questions/:language", async (req, res) => {
    try {
      const { language } = req.params;
      if (language !== "hu" && language !== "de") {
        return res.status(400).json({ message: "Invalid language specified" });
      }

      const questionsTemplate = await storage.getActiveTemplate("unified", "multilingual");

      if (!questionsTemplate || !questionsTemplate.filePath) {
        console.warn("No active 'unified/multilingual' template found.");
        return res.status(404).json({ message: "No active questions template found" });
      }

      const storagePath = questionsTemplate.filePath;
      const tempPath = path.join("/tmp", `template-${Date.now()}-${questionsTemplate.fileName}`);

      await supabaseStorage.downloadFile(storagePath, tempPath);
      console.log(`✅ Template downloaded to ${tempPath}`);

      const questions = await excelParserService.parseQuestionsFromExcel(tempPath);
      console.log(`✅ Parsed ${questions.length} questions.`);

      if (fs.existsSync(tempPath)) {
        fs.unlinkSync(tempPath);
      }

      const formattedQuestions = questions.map((config) => {
        let groupName =
          language === "de" && config.groupNameDe
            ? config.groupNameDe
            : config.groupName;
        const typeStr = config.type as string;
        if (typeStr === "measurement" || typeStr === "calculated") {
          groupName = language === "de" ? "Messdaten" : "Mérési adatok";
        }
        return {
          id: config.questionId,
          title:
            language === "hu"
              ? config.titleHu || config.title
              : config.titleDe || config.title,
          type: config.type,
          required: config.required,
          placeholder: config.placeholder ?? undefined,
          cellReference: config.cellReference ?? undefined,
          sheetName: config.sheetName ?? undefined,
          groupName: groupName ?? undefined,
          groupOrder: config.groupOrder ?? 0,
          unit: config.unit ?? undefined,
          minValue: config.minValue ?? undefined,
          maxValue: config.maxValue ?? undefined,
          calculationFormula: config.calculationFormula ?? undefined,
          calculationInputs: config.calculationInputs ?? undefined,
        };
      });

      res.json(formattedQuestions);
    } catch (error) {
      console.error("❌ Error fetching questions:", error);
      res.status(500).json({ message: "Failed to fetch questions" });
    }
  });

  // Admin: Sablonok listázása
  app.get("/api/admin/templates", async (_req, res) => {
    try {
      const templates = await storage.getAllTemplates();
      res.json(templates);
    } catch (error) {
      console.error("Error fetching templates:", error);
      res.status(500).json({ message: "Failed to fetch templates" });
    }
  });

  // Admin: Feltöltés
  app.post("/api/admin/templates/upload", upload.single("file"), async (req: any, res: any) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }

      const { name, type, language } = req.body;
      if (!name || !type || !language) {
        if (fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
        return res.status(400).json({ message: "Missing required fields" });
      }

      const storagePath = `templates/${Date.now()}-${req.file.originalname}`;
      await supabaseStorage.uploadFile(req.file.path, storagePath);

      await storage.createTemplate({
        name,
        type,
        language,
        fileName: req.file.originalname,
        filePath: storagePath,
        isActive: false,
      });

      if (fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);

      res.json({ success: true, path: storagePath });
    } catch (error) {
      console.error("Error uploading template:", error);
      res.status(500).json({ message: "Failed to upload template" });
    }
  });

  // Admin: Aktiválás
  app.post("/api/admin/templates/:id/activate", async (req, res) => {
    try {
      await storage.setActiveTemplate(req.params.id);
      res.json({ success: true });
    } catch (error) {
      console.error("Error activating template:", error);
      res.status(500).json({ message: "Failed to activate template" });
    }
  });

  // Admin: Törlés
  app.delete("/api/admin/templates/:id", async (req, res) => {
    try {
      const template = await storage.getTemplate(req.params.id);
      if (template?.filePath) {
        await supabaseStorage.deleteFile(template.filePath);
      }
      await storage.deleteTemplate(req.params.id);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting template:", error);
      res.status(500).json({ message: "Failed to delete template" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}

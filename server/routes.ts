import type { Express } from "express";
import { createServer, type Server } from "http";
import multer from "multer";
import express from "express";
import path from "path";
import fs from "fs";

import { storage } from "./storage.js";
import { testConnection } from "./db.js";

import {
  insertProtocolSchema,
  insertTemplateSchema,
  insertQuestionConfigSchema,
} from "../shared/schema.js";

import { excelService } from "./services/excel-service.js";
import { pdfService } from "./services/pdf-service.js";
import { emailService } from "./services/email-service.js";
import { excelParserService } from "./services/excel-parser.js";
import { niedervoltExcelService } from "./services/niedervolt-excel-service.js";
import { errorRoutes } from "./routes/error-routes.js";
import { supabaseStorage } from "./services/supabase-storage.js";

import { z } from "zod";
import JSZip from "jszip";

const uploadDir =
  process.env.NODE_ENV === "production"
    ? "/tmp"
    : path.join(process.cwd(), "uploads");

if (process.env.NODE_ENV !== "production" && !fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const upload = multer({
  dest: uploadDir,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
  fileFilter: (req, file, cb) => {
    if (
      file.mimetype ===
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" ||
      file.mimetype === "application/vnd.ms-excel"
    ) {
      cb(null, true);
    } else {
      cb(new Error("Only Excel files are allowed"));
    }
  },
});

export async function registerRoutes(app: Express): Promise<Server> {
  await testConnection();

  // Serve static assets (client build)
  app.use(express.static(path.join(process.cwd(), "dist")));
  app.use("/api/errors", errorRoutes);

  // -----------------------------------------------------------------------
  //  Protocols – CRUD
  // -----------------------------------------------------------------------
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

  app.get("/api/protocols/preview", async (_req, res) => {
    try {
      const protocols = await storage.getAllProtocols();
      const latestProtocol = protocols[protocols.length - 1];

      if (!latestProtocol) {
        // fallback mock – useful while DB is empty
        const mockProtocol = {
          id: "preview-mock",
          receptionDate: new Date().toISOString().split("T")[0],
          answers: {
            "1": "Példa Átvevő",
            "2": "Példa Cím",
            "3": "1000",
            "4": "Minden rendben",
          },
          errors: [],
          signature: "",
          signatureName: "Példa Aláíró",
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        return res.json(mockProtocol);
      }

      res.json(latestProtocol);
    } catch (error) {
      console.error("Error fetching protocol preview:", error);
      res.status(500).json({ message: "Failed to fetch protocol preview" });
    }
  });

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

  // -----------------------------------------------------------------------
  //  Email & PDF generation
  // -----------------------------------------------------------------------
  app.post("/api/protocols/email", async (req, res) => {
    try {
      const { formData, language, recipient } = req.body;
      const excelBuffer = await excelService.generateExcel(formData, language);
      const pdfBuffer = await pdfService.generatePDF(excelBuffer);

      let errorListPdf = null;
      if (formData.errors?.length) {
        errorListPdf = await pdfService.generateErrorListPDF(
          formData.errors,
          language,
        );
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

  // -----------------------------------------------------------------------
  //  Excel download
  // -----------------------------------------------------------------------
  app.post("/api/protocols/download-excel", async (req, res) => {
    try {
      const { formData, language } = req.body;
      const { simpleXmlExcelService } = await import(
        "./services/simple-xml-excel.js"
      );

      const excelBuffer = await simpleXmlExcelService.generateExcelFromTemplate(
        formData,
        language,
      );

      if (!excelBuffer || excelBuffer.length < 1000) {
        throw new Error(
          "Generated Excel buffer is invalid or too small",
        );
      }

      const liftId = formData.answers["7"] || "Unknown";
      const filename = `AP_${liftId}.xlsx`;

      res.setHeader(
        "Content-Type",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      );
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="${filename}"`,
      );
      res.send(excelBuffer);
    } catch (error) {
      console.error("Error generating Excel download:", error);
      res.status(500).json({ message: "Failed to generate Excel" });
    }
  });

  // -----------------------------------------------------------------------
  //  Image upload (temporary → Supabase storage)
  // -----------------------------------------------------------------------
  app.post("/api/upload", async (req, res) => {
    try {
      const { imageData, fileName } = req.body;
      if (!imageData || !fileName) {
        return res
          .status(400)
          .json({ message: "Missing image data or filename" });
      }

      const base64Data = imageData.replace(
        /^data:image\/[a-z]+;base64,/,
        "",
      );
      const buffer = Buffer.from(base64Data, "base64");
      const tempPath = path.join("/tmp", fileName);
      fs.writeFileSync(tempPath, buffer);

      const timestamp = Date.now();
      const storagePath = `images/${timestamp}-${fileName}`;
      const publicUrl = await supabaseStorage.uploadFile(
        tempPath,
        storagePath,
      );

      fs.unlinkSync(tempPath);
      res.json({ success: true, url: publicUrl });
    } catch (error) {
      console.error("Error uploading image:", error);
      res.status(500).json({ message: "Failed to upload image" });
    }
  });

  // -----------------------------------------------------------------------
  //  ADMIN – Templates
  // -----------------------------------------------------------------------
  app.get("/api/admin/templates", async (_req, res) => {
    try {
      const templates = await storage.getAllTemplates();
      res.json(templates);
    } catch (error) {
      console.error("Error fetching templates:", error);
      res.status(500).json({ message: "Failed to fetch templates" });
    }
  });

  app.post(
    "/api/admin/templates/upload",
    upload.single("file"),
    async (req, res) => {
      try {
        if (!req.file) {
          return res
            .status(400)
            .json({ message: "No file uploaded" });
        }

        const { name, type, language } = req.body;
        if (!name || !type || !language) {
          if (fs.existsSync(req.file.path)) {
            fs.unlinkSync(req.file.path);
          }
          return res
            .status(400)
            .json({ message: "Missing required fields" });
        }

        const storagePath = `templates/${Date.now()}-${req.file.originalname}`;
        const publicUrl = await supabaseStorage.uploadFile(
          req.file.path,
          storagePath,
        );

        await storage.createTemplate({
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

        res.json({ success: true, url: publicUrl });
      } catch (error) {
        console.error("Error uploading template:", error);
        res.status(500).json({ message: "Failed to upload template" });
      }
    },
  );

  app.post(
    "/api/admin/templates/:id/activate",
    async (req, res) => {
      try {
        await storage.setActiveTemplate(req.params.id);
        res.json({ success: true });
      } catch (error) {
        console.error("Error activating template:", error);
        res
          .status(500)
          .json({ message: "Failed to activate template" });
      }
    },
  );

  // -----------------------------------------------------------------------
  //  QUESTIONS – dynamic retrieval from the active template
  // -----------------------------------------------------------------------
  app.get("/api/questions/:language", async (req, res) => {
    try {
      const { language } = req.params;

      // Try unified first, fall back to plain questions
      const typesToTry = ["unified", "questions"];
      const languagesToTry = ["multilingual", language];
      let questionsTemplate: any = null;

      for (const type of typesToTry) {
        for (const lang of languagesToTry) {
          questionsTemplate = await storage.getActiveTemplate(
            type,
            lang,
          );
          if (questionsTemplate) break;
        }
        if (questionsTemplate) break;
      }

      if (!questionsTemplate) {
        return res
          .status(404)
          .json({ message: "No active questions template found" });
      }

      const filePath = questionsTemplate.filePath;
      if (!filePath?.startsWith("http")) {
        throw new Error(
          "Template file path is not a valid Supabase URL.",
        );
      }

      // Download the Excel file to a temporary location
      const tempPath = path.join(
        "/tmp",
        `template-${Date.now()}-${questionsTemplate.fileName}`,
      );

      // Extract the storage path from the public URL
      const urlParts = filePath.split("/");
      const storagePathIndex = urlParts.findIndex(
        (p) => p === "object",
      );
      if (storagePathIndex === -1) {
        throw new Error("Unable to parse Supabase storage URL");
      }
      // after “object” comes the bucket name, then the actual path
      const storagePath = urlParts
        .slice(storagePathIndex + 2)
        .join("/");

      await supabaseStorage.downloadFile(storagePath, tempPath);

      // Parse questions from the downloaded file
      const questions = await excelParserService.parseQuestionsFromExcel(
        tempPath,
      );

      fs.unlinkSync(tempPath);

      // -----------------------------------------------------------------
      //  Format response – language‑specific titles & groups
      // -----------------------------------------------------------------
      const formattedQuestions = questions.map((config) => {
        // Resolve group name – special handling for measurement / calculated groups
        let groupName =
          language === "de" && config.groupNameDe
            ? config.groupNameDe
            : config.groupName;

        // *** FIXED TYPE CHECK ***
        // Cast to string so TypeScript accepts the literals
        const typeStr = config.type as string;
        if (typeStr === "measurement" || typeStr === "calculated") {
          groupName = language === "de" ? "Messdaten" : "Mérési adatok";
        }

        return {
          id: config.questionId,
          title:
            language === "hu" && config.titleHu
              ? config.titleHu
              : language === "de" && config.titleDe
                ? config.titleDe
                : config.title,
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
          calculationFormula:
            config.calculationFormula ?? undefined,
          calculationInputs:
            config.calculationInputs ?? undefined,
        };
      });

      res.json(formattedQuestions);
    } catch (error) {
      console.error("Error fetching questions:", error);
      res
        .status(500)
        .json({ message: "Failed to fetch questions" });
    }
  });

  // -----------------------------------------------------------------------
  //  Niedervolt – devices & dropdown options
  // -----------------------------------------------------------------------
  app.get("/api/niedervolt/devices", async (req, res) => {
    try {
      const { niedervoltService } = await import(
        "./services/niedervolt-service.js"
      );
      const devices = await niedervoltService.getNiedervoltDevices();
      const dropdownOptions = niedervoltService.getDropdownOptions();

      res.json({ devices, dropdownOptions });
    } catch (error) {
      console.error("Error fetching niedervolt devices:", error);
      res
        .status(500)
        .json({ message: "Failed to fetch niedervolt devices" });
    }
  });

  // -----------------------------------------------------------------------
  //  HTTP server creation – return Node http.Server (needed by server‑less adapters)
  // -----------------------------------------------------------------------
  const httpServer = createServer(app);
  return httpServer;
}
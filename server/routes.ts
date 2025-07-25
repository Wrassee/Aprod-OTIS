import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertProtocolSchema } from "@shared/schema";
import { excelService } from "./services/excel-service";
import { pdfService } from "./services/pdf-service";
import { emailService } from "./services/email-service";
import { z } from "zod";

export async function registerRoutes(app: Express): Promise<Server> {
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

  // Get protocol
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

  // Preview PDF
  app.get("/api/protocols/preview", async (req, res) => {
    try {
      // For preview, we'll use mock data
      const mockFormData = {
        receptionDate: new Date().toISOString().split('T')[0],
        answers: {
          q1: 'yes',
          q2: 'yes',
          q3: 1000,
          q4: 'All systems working properly',
        },
        errors: [],
        signature: '',
        signatureName: 'Sample User',
      };
      
      const excelBuffer = await excelService.generateExcel(mockFormData, 'en');
      const pdfBuffer = await pdfService.generatePDF(excelBuffer);
      
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', 'inline; filename=protocol-preview.pdf');
      res.send(pdfBuffer);
    } catch (error) {
      console.error("Error generating PDF preview:", error);
      res.status(500).json({ message: "Failed to generate PDF preview" });
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

  const httpServer = createServer(app);
  return httpServer;
}

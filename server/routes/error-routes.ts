import { Router } from 'express';
import { ErrorExportService } from '../services/error-export\.js';

const router = Router();

// Export errors as PDF
router.post('/export-pdf', async (req, res) => {
  try {
    const { errors, protocolData, language } = req.body;
    
    if (!errors || !Array.isArray(errors)) {
      return res.status(400).json({ error: 'Invalid errors data' });
    }

    const pdfBuffer = await ErrorExportService.generatePDF({
      errors,
      protocolData,
      language: language || 'hu'
    });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="OTIS_Hibalista_${new Date().toISOString().slice(0, 10)}.pdf"`);
    res.send(pdfBuffer);
  } catch (error) {
    console.error('Error generating PDF:', error);
    res.status(500).json({ error: 'Failed to generate PDF' });
  }
});

// Export errors as Excel
router.post('/export-excel', async (req, res) => {
  try {
    const { errors, protocolData, language } = req.body;
    
    if (!errors || !Array.isArray(errors)) {
      return res.status(400).json({ error: 'Invalid errors data' });
    }

    const excelBuffer = await ErrorExportService.generateExcel({
      errors,
      protocolData,
      language: language || 'hu'
    });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="OTIS_Hibalista_${new Date().toISOString().slice(0, 10)}.xlsx"`);
    res.send(excelBuffer);
  } catch (error) {
    console.error('Error generating Excel:', error);
    res.status(500).json({ error: 'Failed to generate Excel' });
  }
});

// Send error list via email (placeholder for SendGrid integration)
router.post('/send-email', async (req, res) => {
  try {
    const { errors, protocolData, language, recipient } = req.body;
    
    // TODO: Implement SendGrid email functionality
    res.status(501).json({ message: 'Email functionality not yet implemented' });
  } catch (error) {
    console.error('Error sending email:', error);
    res.status(500).json({ error: 'Failed to send email' });
  }
});

export { router as errorRoutes };
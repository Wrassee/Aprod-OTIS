interface EmailOptions {
  recipient: string;
  language: string;
  protocolPdf: Buffer;
  errorListPdf?: Buffer | null;
  receptionDate: string;
}

class EmailService {
  async sendProtocolEmail(options: EmailOptions): Promise<void> {
    try {
      // Mock email service - replace with actual email service like Nodemailer
      console.log('Sending email to:', options.recipient);
      console.log('Language:', options.language);
      console.log('Reception date:', options.receptionDate);
      console.log('Protocol PDF size:', options.protocolPdf.length);
      
      if (options.errorListPdf) {
        console.log('Error list PDF size:', options.errorListPdf.length);
      }

      // In a real implementation, you would:
      // 1. Configure nodemailer with SMTP settings
      // 2. Create email template based on language
      // 3. Attach PDF files
      // 4. Send the email

      const emailContent = this.getEmailContent(options.language, options.receptionDate);
      
      // Mock successful send
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      console.log('Email sent successfully');
    } catch (error) {
      console.error('Error sending email:', error);
      throw new Error('Failed to send email');
    }
  }

  private getEmailContent(language: string, receptionDate: string) {
    const templates = {
      hu: {
        subject: `OTIS Átvételi Protokoll - ${receptionDate}`,
        body: `
          Tisztelt Címzett,
          
          Csatolva találja az OTIS lift átvételi protokollt.
          Átvételi dátum: ${receptionDate}
          
          Üdvözlettel,
          OTIS Csapat
        `
      },
      de: {
        subject: `OTIS Abnahmeprotokoll - ${receptionDate}`,
        body: `
          Sehr geehrte Damen und Herren,
          
          Anbei finden Sie das OTIS Aufzug-Abnahmeprotokoll.
          Abnahmedatum: ${receptionDate}
          
          Mit freundlichen Grüßen,
          OTIS Team
        `
      }
    };

    return templates[language as keyof typeof templates] || templates.de;
  }
}

export const emailService = new EmailService();

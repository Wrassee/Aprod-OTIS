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
      // Check if RESEND_API_KEY is available
      const apiKey = process.env.RESEND_API_KEY;
      if (!apiKey) {
        console.log('RESEND_API_KEY not found, using mock email service');
        console.log('Sending email to:', options.recipient);
        console.log('Language:', options.language);
        console.log('Reception date:', options.receptionDate);
        console.log('Protocol PDF size:', options.protocolPdf.length);
        await new Promise(resolve => setTimeout(resolve, 1000));
        console.log('Email sent successfully');
        return;
      }

      // Use Resend API for actual email sending
      const { Resend } = await import('resend');
      const resend = new Resend(apiKey);

      const emailContent = this.getEmailContent(options.language, options.receptionDate);
      
      // Prepare attachments
      const attachments = [
        {
          filename: `OTIS-Protocol-${options.receptionDate}.pdf`,
          content: options.protocolPdf,
        }
      ];

      if (options.errorListPdf) {
        attachments.push({
          filename: `OTIS-ErrorList-${options.receptionDate}.pdf`,
          content: options.errorListPdf,
        });
      }

      // Send email via Resend
      const result = await resend.emails.send({
        from: 'otis-protocol@resend.dev',
        to: options.recipient,
        subject: emailContent.subject,
        html: emailContent.body,
        attachments: attachments as any,
      });

      console.log('Email sent successfully via Resend:', result);
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

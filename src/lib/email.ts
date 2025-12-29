import nodemailer from 'nodemailer';

// Configure transporter
const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.ethereal.email',
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
        user: process.env.SMTP_USER || 'ethereal_user',
        pass: process.env.SMTP_PASS || 'ethereal_pass'
    }
});

interface SendEmailOptions {
    to: string;
    subject: string;
    text: string;
    html?: string;
}

export async function sendEmail({ to, subject, text, html }: SendEmailOptions) {
    // If no SMTP config is present in production (check by some env var if needed), 
    // we might want to log only. For now, we try to send.

    try {
        const info = await transporter.sendMail({
            from: process.env.SMTP_FROM || '"Classroom Scheduler" <noreply@scheduler.com>',
            to,
            subject,
            text,
            html: html || text
        });

        console.log('Message sent: %s', info.messageId);
        // Preview only available when sending through an Ethereal account
        if (nodemailer.getTestMessageUrl(info)) {
            console.log('Preview URL: %s', nodemailer.getTestMessageUrl(info));
        }
        return { success: true, messageId: info.messageId };
    } catch (error) {
        console.error('Error sending email:', error);
        // Fallback for development/demo without SMTP: log the content
        if (process.env.NODE_ENV !== 'production' && !process.env.SMTP_HOST) {
            console.warn('-------- EMAIL FALLBACK (No SMTP Configured) --------');
            console.warn(`To: ${to}`);
            console.warn(`Subject: ${subject}`);
            console.warn(`Content: ${text}`);
            console.warn('-----------------------------------------------------');
            return { success: true, mocked: true };
        }
        return { success: false, error };
    }
}

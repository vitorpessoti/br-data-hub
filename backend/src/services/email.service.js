import nodemailer from 'nodemailer';
import Logger from './logger.service.js';

const logger = new Logger({
    dateFormat: process.env.DATE_FORMAT,
    logsPath: process.env.LOGS_PATH
});

// Sends transactional emails via SMTP. When SMTP is not configured (local
// development without credentials), the message is logged instead of sent,
// so the reset-password flow keeps working without real infrastructure.
export default class EmailService {
    static isConfigured() {
        return Boolean(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASSWORD);
    }

    static #buildTransport() {
        return nodemailer.createTransport({
            host: process.env.SMTP_HOST,
            port: Number(process.env.SMTP_PORT) || 587,
            secure: process.env.SMTP_SECURE === 'true',
            auth: {
                user: process.env.SMTP_USER,
                pass: process.env.SMTP_PASSWORD,
            },
        });
    }

    async send({ to, subject, html, text }) {
        if (!EmailService.isConfigured()) {
            logger.info(`[email] SMTP not configured; skipping send to ${to} — "${subject}"`);
            return { skipped: true };
        }

        const transport = EmailService.#buildTransport();
        return transport.sendMail({
            from: process.env.EMAIL_FROM || process.env.SMTP_USER,
            to,
            subject,
            html,
            text,
        });
    }
}

import { jest } from '@jest/globals';

const loggerInfoMock = jest.fn();
const sendMailMock = jest.fn().mockResolvedValue({ messageId: 'abc' });
const createTransportMock = jest.fn().mockReturnValue({ sendMail: sendMailMock });

jest.unstable_mockModule('nodemailer', () => ({
    default: { createTransport: createTransportMock },
}));
jest.unstable_mockModule('../../src/services/logger.service.js', () => ({
    default: class {
        info(message) {
            loggerInfoMock(message);
        }
    },
}));

const { default: EmailService } = await import('../../src/services/email.service.js');

const ENV_KEYS = ['SMTP_HOST', 'SMTP_PORT', 'SMTP_SECURE', 'SMTP_USER', 'SMTP_PASSWORD', 'EMAIL_FROM'];

beforeEach(() => {
    for (const key of ENV_KEYS) delete process.env[key];
});

describe('# EmailService.isConfigured', () => {
    it('should return false when SMTP is not configured', () => {
        expect(EmailService.isConfigured()).toBe(false);
    });

    it('should return true when SMTP_HOST, SMTP_USER and SMTP_PASSWORD are set', () => {
        process.env.SMTP_HOST = 'smtp.example.com';
        process.env.SMTP_USER = 'user@example.com';
        process.env.SMTP_PASSWORD = 'secret';

        expect(EmailService.isConfigured()).toBe(true);
    });
});

describe('# EmailService.send', () => {
    const message = { to: 'user@example.com', subject: 'Subject', html: '<p>Hi</p>', text: 'Hi' };

    it('should skip sending and log when SMTP is not configured', async () => {
        const result = await new EmailService().send(message);

        expect(result).toEqual({ skipped: true });
        expect(loggerInfoMock).toHaveBeenCalledWith(expect.stringContaining('user@example.com'));
        expect(createTransportMock).not.toHaveBeenCalled();
    });

    it('should send the email through nodemailer using EMAIL_FROM when SMTP is configured', async () => {
        process.env.SMTP_HOST = 'smtp.example.com';
        process.env.SMTP_PORT = '465';
        process.env.SMTP_SECURE = 'true';
        process.env.SMTP_USER = 'user@example.com';
        process.env.SMTP_PASSWORD = 'secret';
        process.env.EMAIL_FROM = 'no-reply@brdatahub.com';

        const result = await new EmailService().send(message);

        expect(createTransportMock).toHaveBeenCalledWith({
            host: 'smtp.example.com',
            port: 465,
            secure: true,
            auth: { user: 'user@example.com', pass: 'secret' },
        });
        expect(sendMailMock).toHaveBeenCalledWith({ from: 'no-reply@brdatahub.com', ...message });
        expect(result).toEqual({ messageId: 'abc' });
    });

    it('should default port to 587, secure to false, and from to SMTP_USER when not provided', async () => {
        process.env.SMTP_HOST = 'smtp.example.com';
        process.env.SMTP_USER = 'user@example.com';
        process.env.SMTP_PASSWORD = 'secret';

        await new EmailService().send(message);

        expect(createTransportMock).toHaveBeenCalledWith({
            host: 'smtp.example.com',
            port: 587,
            secure: false,
            auth: { user: 'user@example.com', pass: 'secret' },
        });
        expect(sendMailMock).toHaveBeenCalledWith({ from: 'user@example.com', ...message });
    });
});

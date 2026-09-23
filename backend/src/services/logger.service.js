import { createLogger, format, transports } from 'winston';

export default class Logger {
    constructor({ dateFormat = 'YYYY-MM-DD HH:mm:ss', logsPath = 'logs/app.log', level = 'info' } = {}) {
        this.logger = createLogger({
            level,
            format: format.combine(
                format.timestamp({ format: dateFormat }),
                format.printf(info => `[${info.timestamp}] ${info.level.toUpperCase()}: ${info.message}`)
            ),
            transports: [
                new transports.Console(),
                new transports.File({ filename: logsPath })
            ]
        });
    }

    info(message) {
        this.logger.info(message);
    }

    error(message) {
        this.logger.error(message);
    }

    warn(message) {
        this.logger.warn(message);
    }

    debug(message) {
        this.logger.debug(message);
    }
}

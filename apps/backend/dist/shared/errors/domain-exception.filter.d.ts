import { ArgumentsHost, ExceptionFilter } from '@nestjs/common';
export declare class DomainExceptionFilter implements ExceptionFilter {
    private readonly logger;
    catch(exception: unknown, host: ArgumentsHost): void;
    private toErrorResponse;
    private normalizeHttpPayload;
}

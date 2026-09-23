import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import {
  DomainError,
  ValidationError,
  ValidationException,
} from '@br-data-hub/shared';
import type { Request, Response } from 'express';
import { ErrorResponseBody } from './error-response';

/**
 * Filtro global de exceções. Centraliza a conversão de qualquer erro em uma
 * resposta HTTP padronizada, para que os controllers não precisem de try/catch.
 */
@Catch()
export class DomainExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(DomainExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const body = this.toErrorResponse(exception, request);

    if (body.statusCode >= HttpStatus.INTERNAL_SERVER_ERROR) {
      this.logger.error(
        `${request.method} ${request.url} -> ${body.statusCode}`,
        exception instanceof Error ? exception.stack : String(exception),
      );
    }

    response.status(body.statusCode).json(body);
  }

  private toErrorResponse(
    exception: unknown,
    request: Request,
  ): ErrorResponseBody {
    const base = {
      timestamp: new Date().toISOString(),
      path: request.url,
    };

    // ValidationException estende DomainError e carrega a lista de erros
    // internos: precisa ser testada ANTES de DomainError.
    if (exception instanceof ValidationException) {
      return {
        ...base,
        statusCode: exception.statusCode,
        message: exception.message,
        errors: exception.errors.map((item) => item.message),
      };
    }

    // ValidationError também estende DomainError; mantemos a mensagem também
    // dentro de `errors` para o frontend tratar de forma uniforme.
    if (exception instanceof ValidationError) {
      return {
        ...base,
        statusCode: exception.statusCode,
        message: exception.message,
        errors: [exception.message],
      };
    }

    // Qualquer erro de domínio respeita o statusCode declarado na própria classe.
    if (exception instanceof DomainError) {
      return {
        ...base,
        statusCode: exception.statusCode,
        message: exception.message,
      };
    }

    // Erros HTTP nativos do Nest (BadRequestException, NotFoundException, etc.).
    if (exception instanceof HttpException) {
      return {
        ...base,
        statusCode: exception.getStatus(),
        ...this.normalizeHttpPayload(exception.getResponse(), exception.message),
      };
    }

    // Erro inesperado: resposta segura, sem vazar detalhes internos.
    return {
      ...base,
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      message: 'Internal server error',
    };
  }

  private normalizeHttpPayload(
    payload: string | object,
    fallback: string,
  ): { message: string; errors?: string[] } {
    if (typeof payload === 'string') {
      return { message: payload };
    }

    const record = payload as Record<string, unknown>;
    const rawMessage = record.message ?? fallback;

    // Nest usa `message: string[]` para erros de validação do class-validator.
    if (Array.isArray(rawMessage)) {
      return { message: fallback, errors: rawMessage.map(String) };
    }

    const result: { message: string; errors?: string[] } = {
      message: String(rawMessage),
    };

    if (Array.isArray(record.errors)) {
      result.errors = record.errors.map(String);
    }

    return result;
  }
}

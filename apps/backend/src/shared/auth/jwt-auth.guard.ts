import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import type { Request } from 'express';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { AuthenticatedUser } from '../types/authenticated-user';
import { JwtPayload } from '../types/jwt-payload';

/**
 * Protege endpoints validando o header `Authorization: Bearer <token>`.
 * Rotas marcadas com `@Public()` são liberadas.
 */
@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly jwtService: JwtService,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest<Request>();
    const token = this.extractToken(request);

    if (!token) {
      throw new UnauthorizedException('Authentication token was not provided.');
    }

    try {
      const payload = await this.jwtService.verifyAsync<JwtPayload>(token);

      (request as Request & { user: AuthenticatedUser }).user =
        this.toAuthenticatedUser(payload);

      return true;
    } catch {
      throw new UnauthorizedException(
        'Invalid or expired authentication token.',
      );
    }
  }

  private extractToken(request: Request): string | undefined {
    const header = request.headers.authorization;

    if (!header) {
      return undefined;
    }

    const [scheme, value] = header.split(' ');

    return scheme?.toLowerCase() === 'bearer' ? value : undefined;
  }

  private toAuthenticatedUser(payload: JwtPayload): AuthenticatedUser {
    const id = payload.sub ?? (payload.id as string | undefined) ?? '';

    return { ...payload, id: String(id) };
  }
}

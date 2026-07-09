import { Injectable, CanActivate, ExecutionContext, UnauthorizedException, ForbiddenException } from '@nestjs/common';
import * as jwt from 'jsonwebtoken';
import { PrismaService } from '../prisma/prisma.service';

const JWT_SECRET = process.env.JWT_SECRET || "ros_super_secret_jwt_key_2026_restuvexo";
const verificationCache = new Map<string, { valid: boolean; timestamp: number }>();
const CACHE_TTL_MS = 30000;

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(private prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException("Access Denied. No token provided or token is malformed.");
    }

    const token = authHeader.split(' ')[1];

    try {
      const decoded = jwt.verify(token, JWT_SECRET) as any;
      if (decoded) {
        if (decoded.id) decoded.id = parseInt(decoded.id, 10);
        if (decoded.restaurantId) decoded.restaurantId = parseInt(decoded.restaurantId, 10);
      }

      if (decoded && decoded.restaurantId && decoded.id) {
        const cacheKey = `${decoded.restaurantId}-${decoded.id}`;
        const cached = verificationCache.get(cacheKey);

        if (cached && (Date.now() - cached.timestamp < CACHE_TTL_MS)) {
          if (!cached.valid) {
            throw new UnauthorizedException("Session expired or database seeded. Please log out and log in again.");
          }
        } else {
          const restaurantExists = await this.prisma.restaurant.findUnique({
            where: { id: decoded.restaurantId },
            select: { id: true }
          });
          const userExists = await this.prisma.user.findUnique({
            where: { id: decoded.id },
            select: { id: true }
          });

          const valid = !!(restaurantExists && userExists);
          verificationCache.set(cacheKey, { valid, timestamp: Date.now() });

          if (!valid) {
            throw new UnauthorizedException("Session expired or database seeded. Please log out and log in again.");
          }
        }
      }

      request.user = decoded;
      return true;
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      throw new ForbiddenException("Forbidden. Invalid or expired token.");
    }
  }
}

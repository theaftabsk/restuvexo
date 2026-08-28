"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthGuard = void 0;
const common_1 = require("@nestjs/common");
const jwt = require("jsonwebtoken");
const prisma_service_1 = require("../prisma/prisma.service");
const JWT_SECRET = process.env.JWT_SECRET || "VexoSecretRosJwtToken2026MasterKey";
const verificationCache = new Map();
const CACHE_TTL_MS = 30000;
let AuthGuard = class AuthGuard {
    constructor(prisma) {
        this.prisma = prisma;
    }
    async canActivate(context) {
        const request = context.switchToHttp().getRequest();
        const authHeader = request.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            throw new common_1.UnauthorizedException("Access Denied. No token provided or token is malformed.");
        }
        const token = authHeader.split(' ')[1];
        try {
            const decoded = jwt.verify(token, JWT_SECRET);
            if (decoded) {
                if (decoded.id)
                    decoded.id = parseInt(decoded.id, 10);
                if (decoded.restaurantId)
                    decoded.restaurantId = parseInt(decoded.restaurantId, 10);
            }
            if (decoded && decoded.restaurantId && decoded.id) {
                const cacheKey = `${decoded.restaurantId}-${decoded.id}`;
                const cached = verificationCache.get(cacheKey);
                if (cached && (Date.now() - cached.timestamp < CACHE_TTL_MS)) {
                    if (!cached.valid) {
                        throw new common_1.UnauthorizedException("Session expired or database seeded. Please log out and log in again.");
                    }
                }
                else {
                    const restaurantExists = await this.prisma.restaurant.findUnique({
                        where: { id: decoded.restaurantId },
                        select: { id: true }
                    });
                    const userRecord = await this.prisma.user.findUnique({
                        where: { id: decoded.id },
                        select: { id: true, restaurantId: true, status: true }
                    });
                    const valid = !!(restaurantExists &&
                        userRecord &&
                        userRecord.restaurantId === decoded.restaurantId &&
                        userRecord.status === 'active');
                    verificationCache.set(cacheKey, { valid, timestamp: Date.now() });
                    if (!valid) {
                        throw new common_1.UnauthorizedException("Session invalid, account deactivated, or cross-tenant access denied. Please log in again.");
                    }
                }
            }
            request.user = decoded;
            return true;
        }
        catch (error) {
            if (error instanceof common_1.UnauthorizedException) {
                throw error;
            }
            throw new common_1.ForbiddenException("Forbidden. Invalid or expired token.");
        }
    }
};
exports.AuthGuard = AuthGuard;
exports.AuthGuard = AuthGuard = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], AuthGuard);
//# sourceMappingURL=auth.guard.js.map
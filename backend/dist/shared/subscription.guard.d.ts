import { CanActivate, ExecutionContext } from '@nestjs/common';
import { SettingsService } from './settings.service';
import { PrismaService } from '../prisma/prisma.service';
export declare class SubscriptionGuard implements CanActivate {
    private settingsService;
    private prisma;
    constructor(settingsService: SettingsService, prisma: PrismaService);
    canActivate(context: ExecutionContext): Promise<boolean>;
}

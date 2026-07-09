import { PrismaService } from '../../prisma/prisma.service';
import { SettingsService } from '../../shared/settings.service';
export declare class SuperAdminService {
    private prisma;
    private settingsService;
    constructor(prisma: PrismaService, settingsService: SettingsService);
    getStats(req: any, res: any): Promise<any>;
    getRestaurants(req: any, res: any): Promise<any>;
    getRestaurantById(req: any, res: any): Promise<any>;
    updateRestaurantSettings(req: any, res: any): Promise<any>;
    deleteRestaurant(req: any, res: any): Promise<any>;
    getDemoRequests(req: any, res: any): Promise<any>;
    updateDemoRequest(req: any, res: any): Promise<any>;
    deleteDemoRequest(req: any, res: any): Promise<any>;
}

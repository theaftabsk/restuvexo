import { Request, Response } from 'express';
import { SuperAdminService } from './superAdmin.service';
export declare class SuperAdminController {
    private superAdminService;
    constructor(superAdminService: SuperAdminService);
    getStats(req: Request, res: Response): Promise<any>;
    getRestaurants(req: Request, res: Response): Promise<any>;
    getRestaurantById(req: Request, res: Response): Promise<any>;
    updateRestaurantSettings(req: Request, res: Response): Promise<any>;
    deleteRestaurant(req: Request, res: Response): Promise<any>;
    getDemoRequests(req: Request, res: Response): Promise<any>;
    updateDemoRequest(req: Request, res: Response): Promise<any>;
    deleteDemoRequest(req: Request, res: Response): Promise<any>;
}

import { Request, Response } from 'express';
import { DashboardService } from './dashboard.service';
export declare class DashboardController {
    private dashboardService;
    constructor(dashboardService: DashboardService);
    getDashboardStats(req: Request, res: Response): Promise<void>;
    getSidebarTelemetry(req: Request, res: Response): Promise<void>;
}

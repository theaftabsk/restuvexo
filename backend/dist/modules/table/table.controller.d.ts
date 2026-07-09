import { Request, Response } from 'express';
import { TableService } from './table.service';
export declare class TableController {
    private tableService;
    constructor(tableService: TableService);
    getTables(req: Request, res: Response): Promise<any>;
    createTable(req: Request, res: Response): Promise<any>;
    updateTable(req: Request, res: Response): Promise<any>;
    deleteTable(req: Request, res: Response): Promise<any>;
    getActiveSessions(req: Request, res: Response): Promise<any>;
    clearActiveSession(req: Request, res: Response): Promise<any>;
    getSettings(req: Request, res: Response): Promise<void>;
    updateSettings(req: Request, res: Response): Promise<void>;
    blockDevice(req: Request, res: Response): Promise<any>;
    getBlacklistedDevices(req: Request, res: Response): Promise<void>;
    unblockDevice(req: Request, res: Response): Promise<void>;
}

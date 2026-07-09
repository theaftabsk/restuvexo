import { Request, Response } from 'express';
import { InventoryService } from './inventory.service';
export declare class InventoryController {
    private inventoryService;
    constructor(inventoryService: InventoryService);
    getInventory(req: Request, res: Response): Promise<void>;
    addInventoryItem(req: Request, res: Response): Promise<any>;
    updateInventoryItem(req: Request, res: Response): Promise<any>;
    deleteInventoryItem(req: Request, res: Response): Promise<any>;
}

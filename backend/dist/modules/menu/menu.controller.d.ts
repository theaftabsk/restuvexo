import { Request, Response } from 'express';
import { MenuService } from './menu.service';
export declare class MenuController {
    private menuService;
    constructor(menuService: MenuService);
    createCategory(req: Request, res: Response): Promise<any>;
    getCategories(req: Request, res: Response): Promise<void>;
    updateCategory(req: Request, res: Response): Promise<any>;
    deleteCategory(req: Request, res: Response): Promise<any>;
    createMenuItem(req: Request, res: Response): Promise<any>;
    getMenuItems(req: Request, res: Response): Promise<void>;
    updateMenuItem(req: Request, res: Response): Promise<any>;
    deleteMenuItem(req: Request, res: Response): Promise<any>;
}

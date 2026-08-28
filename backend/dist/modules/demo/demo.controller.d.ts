import { Request, Response } from 'express';
import { DemoService } from './demo.service';
export declare class DemoController {
    private demoService;
    constructor(demoService: DemoService);
    createDemoRequest(req: Request, res: Response): Promise<any>;
}

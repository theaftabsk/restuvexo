import { PrismaService } from '../../prisma/prisma.service';
export declare class DemoService {
    private prisma;
    constructor(prisma: PrismaService);
    createDemoRequest(req: any, res: any): Promise<any>;
    getDemoRequests(req: any, res: any): Promise<any>;
}

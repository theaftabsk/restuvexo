import { PrismaService } from '../../prisma/prisma.service';
import { SettingsService } from '../../shared/settings.service';
export declare class ChatbotService {
    private prisma;
    private settingsService;
    constructor(prisma: PrismaService, settingsService: SettingsService);
    handleChat(req: any, res: any): Promise<any>;
}

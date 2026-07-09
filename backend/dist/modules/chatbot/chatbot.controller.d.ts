import { Request, Response } from 'express';
import { ChatbotService } from './chatbot.service';
export declare class ChatbotController {
    private chatbotService;
    constructor(chatbotService: ChatbotService);
    handleChat(req: Request, res: Response): Promise<any>;
}

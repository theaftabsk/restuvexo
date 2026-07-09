
import { Controller, Req, Res, UseGuards, Post } from '@nestjs/common';
import { Request, Response } from 'express';
import { ChatbotService } from './chatbot.service';
import { AuthGuard } from '../../shared/auth.guard';


@Controller('api/chatbot')
export class ChatbotController {
  constructor(private chatbotService: ChatbotService) {}

  
  @UseGuards(AuthGuard)
  @Post('chat')
  async handleChat(@Req() req: Request, @Res() res: Response) {
    return this.chatbotService.handleChat(req, res);
  }

}

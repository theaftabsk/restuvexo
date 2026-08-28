
import { Controller, Req, Res, UseGuards } from '@nestjs/common';
import { Request, Response } from 'express';
import { DemoService } from './demo.service';


@Controller('api/demo')
export class DemoController {
  constructor(private demoService: DemoService) {}

  @Post()
  async createDemoRequest(@Req() req: Request, @Res() res: Response) {
    return this.demoService.createDemoRequest(req, res);
  }
}

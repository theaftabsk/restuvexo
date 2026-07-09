
import { Controller, Req, Res, UseGuards } from '@nestjs/common';
import { Request, Response } from 'express';
import { DemoService } from './demo.service';


@Controller('api/demo')
export class DemoController {
  constructor(private demoService: DemoService) {}

  
}

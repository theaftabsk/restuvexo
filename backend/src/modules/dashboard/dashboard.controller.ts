
import { Controller, Req, Res, UseGuards, Get } from '@nestjs/common';
import { Request, Response } from 'express';
import { DashboardService } from './dashboard.service';
import { AuthGuard } from '../../shared/auth.guard';


@Controller('api/dashboard')
export class DashboardController {
  constructor(private dashboardService: DashboardService) {}

  
  @UseGuards(AuthGuard)
  @Get('stats')
  async getDashboardStats(@Req() req: Request, @Res() res: Response) {
    return this.dashboardService.getDashboardStats(req, res);
  }

  @UseGuards(AuthGuard)
  @Get('sidebar-telemetry')
  async getSidebarTelemetry(@Req() req: Request, @Res() res: Response) {
    return this.dashboardService.getSidebarTelemetry(req, res);
  }

}

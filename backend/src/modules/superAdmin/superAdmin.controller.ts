
import { Controller, Req, Res, UseGuards, Get, Put, Delete } from '@nestjs/common';
import { Request, Response } from 'express';
import { SuperAdminService } from './superAdmin.service';


@Controller('api/super-admin')
export class SuperAdminController {
  constructor(private superAdminService: SuperAdminService) {}

  
  @Get('stats')
  async getStats(@Req() req: Request, @Res() res: Response) {
    return this.superAdminService.getStats(req, res);
  }

  @Get('restaurants')
  async getRestaurants(@Req() req: Request, @Res() res: Response) {
    return this.superAdminService.getRestaurants(req, res);
  }

  @Get('restaurants/:id')
  async getRestaurantById(@Req() req: Request, @Res() res: Response) {
    return this.superAdminService.getRestaurantById(req, res);
  }

  @Put('restaurants/:id/settings')
  async updateRestaurantSettings(@Req() req: Request, @Res() res: Response) {
    return this.superAdminService.updateRestaurantSettings(req, res);
  }

  @Delete('restaurants/:id')
  async deleteRestaurant(@Req() req: Request, @Res() res: Response) {
    return this.superAdminService.deleteRestaurant(req, res);
  }

  @Get('demo-requests')
  async getDemoRequests(@Req() req: Request, @Res() res: Response) {
    return this.superAdminService.getDemoRequests(req, res);
  }

  @Put('demo-requests/:id')
  async updateDemoRequest(@Req() req: Request, @Res() res: Response) {
    return this.superAdminService.updateDemoRequest(req, res);
  }

  @Delete('demo-requests/:id')
  async deleteDemoRequest(@Req() req: Request, @Res() res: Response) {
    return this.superAdminService.deleteDemoRequest(req, res);
  }

}

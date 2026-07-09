
import { Controller, Req, Res, UseGuards, Get, Post, Patch, Delete } from '@nestjs/common';
import { Request, Response } from 'express';
import { InventoryService } from './inventory.service';
import { AuthGuard } from '../../shared/auth.guard';


@Controller('api/inventory')
export class InventoryController {
  constructor(private inventoryService: InventoryService) {}

  
  @UseGuards(AuthGuard)
  @Get()
  async getInventory(@Req() req: Request, @Res() res: Response) {
    return this.inventoryService.getInventory(req, res);
  }

  @UseGuards(AuthGuard)
  @Post()
  async addInventoryItem(@Req() req: Request, @Res() res: Response) {
    return this.inventoryService.addInventoryItem(req, res);
  }

  @UseGuards(AuthGuard)
  @Patch(':id')
  async updateInventoryItem(@Req() req: Request, @Res() res: Response) {
    return this.inventoryService.updateInventoryItem(req, res);
  }

  @UseGuards(AuthGuard)
  @Delete(':id')
  async deleteInventoryItem(@Req() req: Request, @Res() res: Response) {
    return this.inventoryService.deleteInventoryItem(req, res);
  }

}

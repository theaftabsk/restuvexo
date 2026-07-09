
import { Controller, Req, Res, UseGuards, Post, Get, Put, Delete } from '@nestjs/common';
import { Request, Response } from 'express';
import { MenuService } from './menu.service';
import { AuthGuard } from '../../shared/auth.guard';


@Controller('api/menu')
export class MenuController {
  constructor(private menuService: MenuService) {}

  
  @UseGuards(AuthGuard)
  @Post('categories')
  async createCategory(@Req() req: Request, @Res() res: Response) {
    return this.menuService.createCategory(req, res);
  }

  @UseGuards(AuthGuard)
  @Get('categories')
  async getCategories(@Req() req: Request, @Res() res: Response) {
    return this.menuService.getCategories(req, res);
  }

  @UseGuards(AuthGuard)
  @Put('categories/:id')
  async updateCategory(@Req() req: Request, @Res() res: Response) {
    return this.menuService.updateCategory(req, res);
  }

  @UseGuards(AuthGuard)
  @Delete('categories/:id')
  async deleteCategory(@Req() req: Request, @Res() res: Response) {
    return this.menuService.deleteCategory(req, res);
  }

  @UseGuards(AuthGuard)
  @Post('menu-items')
  async createMenuItem(@Req() req: Request, @Res() res: Response) {
    return this.menuService.createMenuItem(req, res);
  }

  @UseGuards(AuthGuard)
  @Get('menu-items')
  async getMenuItems(@Req() req: Request, @Res() res: Response) {
    return this.menuService.getMenuItems(req, res);
  }

  @UseGuards(AuthGuard)
  @Put('menu-items/:id')
  async updateMenuItem(@Req() req: Request, @Res() res: Response) {
    return this.menuService.updateMenuItem(req, res);
  }

  @UseGuards(AuthGuard)
  @Delete('menu-items/:id')
  async deleteMenuItem(@Req() req: Request, @Res() res: Response) {
    return this.menuService.deleteMenuItem(req, res);
  }

}

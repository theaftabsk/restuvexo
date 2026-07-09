
import { Controller, Req, Res, UseGuards, Post, Get, Put, Patch, Delete } from '@nestjs/common';
import { Request, Response } from 'express';
import { OrderService } from './order.service';
import { AuthGuard } from '../../shared/auth.guard';


@Controller('api/order')
export class OrderController {
  constructor(private orderService: OrderService) {}

  
  @Post('generate-templink')
  async generateTemplink(@Req() req: Request, @Res() res: Response) {
    return this.orderService.generateTemplink(req, res);
  }

  @Get('qr-menu/:tableId')
  async getQrMenu(@Req() req: Request, @Res() res: Response) {
    return this.orderService.getQrMenu(req, res);
  }

  @Post('qr-place')
  async createQrOrder(@Req() req: Request, @Res() res: Response) {
    return this.orderService.createQrOrder(req, res);
  }

  @UseGuards(AuthGuard)
  @Post()
  async createOrder(@Req() req: Request, @Res() res: Response) {
    return this.orderService.createOrder(req, res);
  }

  @UseGuards(AuthGuard)
  @Get()
  async getOrders(@Req() req: Request, @Res() res: Response) {
    return this.orderService.getOrders(req, res);
  }

  @UseGuards(AuthGuard)
  @Put(':id')
  async updateOrder(@Req() req: Request, @Res() res: Response) {
    return this.orderService.updateOrder(req, res);
  }

  @UseGuards(AuthGuard)
  @Patch(':id/status')
  async updateOrderStatus(@Req() req: Request, @Res() res: Response) {
    return this.orderService.updateOrderStatus(req, res);
  }

  @UseGuards(AuthGuard)
  @Patch(':id/approve')
  async approveQrOrder(@Req() req: Request, @Res() res: Response) {
    return this.orderService.approveQrOrder(req, res);
  }

  @UseGuards(AuthGuard)
  @Patch(':id/settle')
  async settleOrder(@Req() req: Request, @Res() res: Response) {
    return this.orderService.settleOrder(req, res);
  }

  @UseGuards(AuthGuard)
  @Delete(':id')
  async deleteOrder(@Req() req: Request, @Res() res: Response) {
    return this.orderService.deleteOrder(req, res);
  }

}

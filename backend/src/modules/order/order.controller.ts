
import { Controller, Req, Res, UseGuards, Post, Get, Put, Patch, Delete } from '@nestjs/common';
import { Request, Response } from 'express';
import { OrderService } from './order.service';
import { AuthGuard } from '../../shared/auth.guard';


@Controller(['api/order', 'api/orders'])
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
  @Post(':id/items')
  async addOrderItems(@Req() req: Request, @Res() res: Response) {
    return this.orderService.updateOrder(req, res);
  }

  @UseGuards(AuthGuard)
  @Patch(':id/status')
  async updateOrderStatusPatch(@Req() req: Request, @Res() res: Response) {
    return this.orderService.updateOrderStatus(req, res);
  }

  @UseGuards(AuthGuard)
  @Put(':id/status')
  async updateOrderStatusPut(@Req() req: Request, @Res() res: Response) {
    return this.orderService.updateOrderStatus(req, res);
  }

  @UseGuards(AuthGuard)
  @Patch(':id/approve')
  async approveQrOrderPatch(@Req() req: Request, @Res() res: Response) {
    return this.orderService.approveQrOrder(req, res);
  }

  @UseGuards(AuthGuard)
  @Put(':id/approve')
  async approveQrOrderPut(@Req() req: Request, @Res() res: Response) {
    return this.orderService.approveQrOrder(req, res);
  }

  @UseGuards(AuthGuard)
  @Patch(':id/settle')
  async settleOrderPatch(@Req() req: Request, @Res() res: Response) {
    return this.orderService.settleOrder(req, res);
  }

  @UseGuards(AuthGuard)
  @Put(':id/settle')
  async settleOrderPut(@Req() req: Request, @Res() res: Response) {
    return this.orderService.settleOrder(req, res);
  }

  @UseGuards(AuthGuard)
  @Delete(':id')
  async deleteOrder(@Req() req: Request, @Res() res: Response) {
    return this.orderService.deleteOrder(req, res);
  }

  @UseGuards(AuthGuard)
  @Post('merge')
  async mergeOrders(@Req() req: Request, @Res() res: Response) {
    return this.orderService.mergeOrders(req, res);
  }

  @UseGuards(AuthGuard)
  @Post(':id/split')
  async splitOrder(@Req() req: Request, @Res() res: Response) {
    return this.orderService.splitOrder(req, res);
  }

  @UseGuards(AuthGuard)
  @Patch(':id/move-table')
  async moveTable(@Req() req: Request, @Res() res: Response) {
    return this.orderService.moveTable(req, res);
  }

  @UseGuards(AuthGuard)
  @Post(':id/reprint')
  async reprintOrder(@Req() req: Request, @Res() res: Response) {
    return this.orderService.reprintOrder(req, res);
  }

  @UseGuards(AuthGuard)
  @Patch(':id/discount')
  async applyDiscount(@Req() req: Request, @Res() res: Response) {
    return this.orderService.applyDiscount(req, res);
  }

  @UseGuards(AuthGuard)
  @Patch(':id/assign-waiter')
  async assignWaiter(@Req() req: Request, @Res() res: Response) {
    return this.orderService.assignWaiter(req, res);
  }

  @UseGuards(AuthGuard)
  @Patch(':id/void')
  async voidOrder(@Req() req: Request, @Res() res: Response) {
    return this.orderService.voidOrder(req, res);
  }

  @UseGuards(AuthGuard)
  @Get(':id/logs')
  async getOrderLogs(@Req() req: Request, @Res() res: Response) {
    return this.orderService.getOrderLogs(req, res);
  }

}

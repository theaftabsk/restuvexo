import { Controller, Get, Post, Body, Req, Res, UseGuards, HttpStatus } from '@nestjs/common';
import { AuthGuard } from '../../shared/auth.guard';
import { SubscriptionService } from './subscription.service';
import { Request, Response } from 'express';

@Controller('api/subscription')
export class SubscriptionController {
  constructor(private subscriptionService: SubscriptionService) {}

  @Get('status')
  @UseGuards(AuthGuard)
  async getStatus(@Req() req: any, @Res() res: Response) {
    const restaurantId = req.user.restaurantId;
    try {
      const status = await this.subscriptionService.getSubscriptionStatus(restaurantId);
      return res.json(status);
    } catch (e) {
      console.error('[Subscription Status GET Error]', e);
      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ error: 'Failed to retrieve subscription status.' });
    }
  }

  @Post('purchase-addon')
  @UseGuards(AuthGuard)
  async purchaseAddon(@Req() req: any, @Res() res: Response, @Body() body: { addonCode: string; quantity: number }) {
    const restaurantId = req.user.restaurantId;
    const { addonCode, quantity } = body;
    if (!addonCode || !quantity || quantity < 1) {
      return res.status(HttpStatus.BAD_REQUEST).json({ error: 'Invalid addon purchase payload.' });
    }

    try {
      const result = await this.subscriptionService.purchaseAddon(restaurantId, addonCode, quantity);
      return res.json(result);
    } catch (e) {
      console.error('[Subscription Purchase Addon POST Error]', e);
      return res.status(e.status || HttpStatus.INTERNAL_SERVER_ERROR).json({ error: e.message || 'Failed to purchase addon.' });
    }
  }

  @Get('invoices')
  @UseGuards(AuthGuard)
  async getInvoices(@Req() req: any, @Res() res: Response) {
    const restaurantId = req.user.restaurantId;
    try {
      const invoices = await this.subscriptionService.getInvoices(restaurantId);
      return res.json(invoices);
    } catch (e) {
      console.error('[Subscription Invoices GET Error]', e);
      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ error: 'Failed to retrieve billing invoices.' });
    }
  }
}

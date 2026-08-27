import {
  Controller,
  Get,
  Post,
  Body,
  Req,
  Res,
  UseGuards,
  Query,
  HttpStatus
} from '@nestjs/common';
import { AuthGuard } from '../../shared/auth.guard';
import { SubscriptionService } from './subscription.service';
import { Request, Response } from 'express';

@Controller('api/subscription')
export class SubscriptionController {
  constructor(private subscriptionService: SubscriptionService) {}

  // 1. Public: Get All Active SaaS Plans
  @Get('plans')
  async getPlans(@Res() res: Response) {
    try {
      const plans = await this.subscriptionService.getPlans();
      return res.json(plans);
    } catch (e: any) {
      console.error('[Get Plans Error]', e);
      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ error: 'Failed to retrieve plans.' });
    }
  }

  // 2. Restaurant: Get Current Subscription & Billing Dashboard
  @UseGuards(AuthGuard)
  @Get('my-subscription')
  async getMySubscription(@Req() req: any, @Res() res: Response) {
    const restaurantId = req.user.restaurantId;
    try {
      const data = await this.subscriptionService.getMySubscription(restaurantId);
      return res.json(data);
    } catch (e: any) {
      console.error('[Get My Subscription Error]', e);
      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ error: 'Failed to load subscription.' });
    }
  }

  // 3. Restaurant: Create Cashfree Checkout Order (₹1 First Month or Renewal)
  @UseGuards(AuthGuard)
  @Post('cashfree/create-order')
  async createCashfreeOrder(
    @Req() req: any,
    @Res() res: Response,
    @Body() body: { planId?: number; isRenewal?: boolean }
  ) {
    const restaurantId = req.user.restaurantId;
    try {
      const result = await this.subscriptionService.createCashfreeOrder(restaurantId, body.planId, body.isRenewal);
      if (!result.success) {
        return res.status(HttpStatus.BAD_REQUEST).json(result);
      }
      return res.status(HttpStatus.OK).json(result);
    } catch (e: any) {
      console.error('[Create Cashfree Order Error]', e);
      return res.status(HttpStatus.BAD_REQUEST).json({ success: false, error: e.message || 'Failed to create payment order.' });
    }
  }

  // 4. Restaurant: Verify Cashfree Payment
  @UseGuards(AuthGuard)
  @Post('cashfree/verify')
  async verifyCashfreePayment(
    @Req() req: any,
    @Res() res: Response,
    @Body() body: { orderId: string; planId?: number }
  ) {
    const restaurantId = req.user.restaurantId;
    if (!body || !body.orderId) {
      return res.status(HttpStatus.BAD_REQUEST).json({ success: false, error: 'Order ID is required.' });
    }
    try {
      const result = await this.subscriptionService.verifyCashfreePayment(restaurantId, body.orderId, body.planId);
      if (!result.success) {
        return res.status(HttpStatus.BAD_REQUEST).json(result);
      }
      return res.status(HttpStatus.OK).json(result);
    } catch (e: any) {
      console.error('[Verify Cashfree Payment Error]', e);
      return res.status(HttpStatus.BAD_REQUEST).json({ success: false, error: e.message || 'Payment verification failed.' });
    }
  }

  // 4b. Public Cashfree Webhook Listener (v2023-08-01)
  @Post('cashfree/webhook')
  async handleCashfreeWebhook(
    @Req() req: Request,
    @Res() res: Response,
    @Body() body: any
  ) {
    try {
      const signature = req.headers['x-webhook-signature'] as string;
      const timestamp = req.headers['x-webhook-timestamp'] as string;
      const result = await this.subscriptionService.handleCashfreeWebhook(body, signature, timestamp);
      return res.status(HttpStatus.OK).json(result);
    } catch (e: any) {
      console.error('[Cashfree Webhook Error]', e);
      return res.status(HttpStatus.OK).json({ status: 'ERROR', message: e.message });
    }
  }

  // 5. Super Admin: List Tenant Subscriptions with MRR Telemetry
  @UseGuards(AuthGuard)
  @Get('admin/subscriptions')
  async getAdminSubscriptions(
    @Query('status') status: string,
    @Query('search') search: string,
    @Query('page') page: string,
    @Query('limit') limit: string,
    @Res() res: Response
  ) {
    try {
      const data = await this.subscriptionService.getAdminSubscriptions(
        status || 'ALL',
        search || '',
        parseInt(page) || 1,
        parseInt(limit) || 50
      );
      return res.json(data);
    } catch (e: any) {
      console.error('[Admin Subscriptions Error]', e);
      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ error: 'Failed to load admin subscriptions.' });
    }
  }

  // 6. Super Admin: Extend Subscription
  @UseGuards(AuthGuard)
  @Post('admin/extend')
  async adminExtendSubscription(
    @Req() req: any,
    @Res() res: Response,
    @Body() body: { subscriptionId: number; days: number; reason: string }
  ) {
    try {
      const actor = req.user.name || 'Super Admin';
      const result = await this.subscriptionService.adminExtendSubscription(
        body.subscriptionId,
        body.days,
        body.reason,
        actor
      );
      return res.json(result);
    } catch (e: any) {
      console.error('[Admin Extend Error]', e);
      return res.status(HttpStatus.BAD_REQUEST).json({ error: e.message || 'Failed to extend subscription.' });
    }
  }

  // 7. Super Admin: Record Offline / Manual Payment
  @UseGuards(AuthGuard)
  @Post('admin/record-payment')
  async adminRecordPayment(
    @Req() req: any,
    @Res() res: Response,
    @Body() body: {
      subscriptionId: number;
      amount: number;
      paymentMethod: string;
      transactionId: string;
      notes: string;
    }
  ) {
    try {
      const actor = req.user.name || 'Super Admin';
      const result = await this.subscriptionService.adminRecordPayment(
        body.subscriptionId,
        body.amount,
        body.paymentMethod,
        body.transactionId,
        body.notes,
        actor
      );
      return res.json(result);
    } catch (e: any) {
      console.error('[Admin Record Payment Error]', e);
      return res.status(HttpStatus.BAD_REQUEST).json({ error: e.message || 'Failed to record payment.' });
    }
  }

  // 8. Super Admin: Change Plan & Price Snapshot
  @UseGuards(AuthGuard)
  @Post('admin/change-plan')
  async adminChangePlan(
    @Req() req: any,
    @Res() res: Response,
    @Body() body: { subscriptionId: number; newPlanId: number; customRenewalPrice?: number }
  ) {
    try {
      const actor = req.user.name || 'Super Admin';
      const result = await this.subscriptionService.adminChangePlan(
        body.subscriptionId,
        body.newPlanId,
        body.customRenewalPrice,
        actor
      );
      return res.json(result);
    } catch (e: any) {
      console.error('[Admin Change Plan Error]', e);
      return res.status(HttpStatus.BAD_REQUEST).json({ error: e.message || 'Failed to change plan.' });
    }
  }

  // 9. Super Admin: Suspend / Reactivate / Cancel
  @UseGuards(AuthGuard)
  @Post('admin/change-status')
  async adminChangeStatus(
    @Req() req: any,
    @Res() res: Response,
    @Body() body: { subscriptionId: number; status: any; reason: string }
  ) {
    try {
      const actor = req.user.name || 'Super Admin';
      const result = await this.subscriptionService.adminChangeStatus(
        body.subscriptionId,
        body.status,
        body.reason,
        actor
      );
      return res.json(result);
    } catch (e: any) {
      console.error('[Admin Change Status Error]', e);
      return res.status(HttpStatus.BAD_REQUEST).json({ error: e.message || 'Failed to update status.' });
    }
  }

  // 10. Daily Cron Trigger Endpoint
  @Post('admin/run-cron')
  async runCron(@Res() res: Response) {
    try {
      const result = await this.subscriptionService.processDailyCron();
      return res.json(result);
    } catch (e: any) {
      console.error('[Cron Execution Error]', e);
      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ error: 'Cron execution failed.' });
    }
  }
}

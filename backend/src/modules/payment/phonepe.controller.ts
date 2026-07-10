import { Controller, Get, Post, Body, Param, Res, UseGuards, HttpStatus } from '@nestjs/common';
import { AuthGuard } from '../../shared/auth.guard';
import { PhonePeService } from './phonepe.service';
import { Response } from 'express';

@Controller('api/payment/phonepe')
export class PhonePeController {
  constructor(private readonly phonePeService: PhonePeService) {}

  @Post('initiate')
  @UseGuards(AuthGuard)
  async initiate(
    @Res() res: Response,
    @Body() body: { orderId: number; redirectUrl: string }
  ) {
    const { orderId, redirectUrl } = body;
    if (!orderId || !redirectUrl) {
      return res.status(HttpStatus.BAD_REQUEST).json({ error: 'orderId and redirectUrl are required.' });
    }

    try {
      const paymentUrl = await this.phonePeService.initiatePayment(orderId, redirectUrl);
      return res.json({ paymentUrl });
    } catch (e) {
      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ error: e.message || 'Failed to initiate payment.' });
    }
  }

  @Post('callback')
  async callback(
    @Res() res: Response,
    @Body() body: { response: string }
  ) {
    try {
      const result = await this.phonePeService.processCallback(body);
      return res.json(result);
    } catch (e) {
      console.error('[PhonePe Webhook Callback Error]', e);
      return res.status(HttpStatus.BAD_REQUEST).json({ error: e.message || 'Webhook processing failed.' });
    }
  }

  @Get('status/:txnId')
  @UseGuards(AuthGuard)
  async status(
    @Res() res: Response,
    @Param('txnId') txnId: string
  ) {
    if (!txnId) {
      return res.status(HttpStatus.BAD_REQUEST).json({ error: 'txnId is required.' });
    }

    try {
      const status = await this.phonePeService.checkTransactionStatus(txnId);
      return res.json(status);
    } catch (e) {
      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ error: e.message || 'Failed to check status.' });
    }
  }
}

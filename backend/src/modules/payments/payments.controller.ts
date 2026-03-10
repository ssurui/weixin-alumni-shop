import {
  Controller, Get, Post, Body, Query,
  UseGuards, HttpCode, HttpStatus, Req,
} from '@nestjs/common';
import { Request } from 'express';
import { PaymentsService } from './payments.service';
import { ExchangeRateService } from './exchange-rate.service';
import { WxPrepayDto } from './dto/wx-prepay.dto';
import { PaypalCreateDto } from './dto/paypal-create.dto';
import { PaypalCaptureDto } from './dto/paypal-capture.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Public } from '../../common/decorators/public.decorator';

@Controller('payments')
export class PaymentsController {
  constructor(
    private readonly paymentsService: PaymentsService,
    private readonly exchangeRateService: ExchangeRateService,
  ) {}

  /**
   * 获取汇率（REQ-048）
   * GET /api/v1/payments/exchange-rate
   */
  @Get('exchange-rate')
  async getExchangeRate(
    @Query('from') from: string = 'USD',
    @Query('to') to: string = 'CNY',
  ) {
    return this.exchangeRateService.getRate(from, to);
  }

  /**
   * 微信支付预下单（REQ-041）
   * POST /api/v1/payments/wx/prepay
   */
  @UseGuards(JwtAuthGuard)
  @Post('wx/prepay')
  async wxPrepay(
    @CurrentUser('id') userId: bigint,
    @CurrentUser('openid') openid: string,
    @Body() dto: WxPrepayDto,
  ) {
    return this.paymentsService.wxPrepay(userId, openid, dto);
  }

  /**
   * 微信支付回调（REQ-042）
   * POST /api/v1/payments/wx/notify
   * 不需要JWT鉴权，需验签
   */
  @Public()
  @Post('wx/notify')
  @HttpCode(HttpStatus.OK)
  async wxNotify(@Req() req: Request) {
    return this.paymentsService.wxNotify(req);
  }

  /**
   * 创建PayPal订单（REQ-044）
   * POST /api/v1/payments/paypal/create
   */
  @UseGuards(JwtAuthGuard)
  @Post('paypal/create')
  async paypalCreate(
    @CurrentUser('id') userId: bigint,
    @Body() dto: PaypalCreateDto,
  ) {
    return this.paymentsService.paypalCreate(userId, dto);
  }

  /**
   * 捕获PayPal支付（REQ-045）
   * POST /api/v1/payments/paypal/capture
   */
  @UseGuards(JwtAuthGuard)
  @Post('paypal/capture')
  async paypalCapture(
    @CurrentUser('id') userId: bigint,
    @Body() dto: PaypalCaptureDto,
  ) {
    return this.paymentsService.paypalCapture(userId, dto);
  }

  /**
   * PayPal Webhook（REQ-046）
   * POST /api/v1/payments/paypal/webhook
   */
  @Public()
  @Post('paypal/webhook')
  @HttpCode(HttpStatus.OK)
  async paypalWebhook(@Req() req: Request) {
    return this.paymentsService.paypalWebhook(req);
  }
}

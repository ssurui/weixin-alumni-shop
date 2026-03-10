import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';
import { PrismaService } from '../../prisma/prisma.service';
import { ExchangeRateService } from './exchange-rate.service';
import { WxPrepayDto } from './dto/wx-prepay.dto';
import { PaypalCreateDto } from './dto/paypal-create.dto';
import { PaypalCaptureDto } from './dto/paypal-capture.dto';
import { v4 as uuidv4 } from 'uuid';
import axios from 'axios';
import crypto from 'crypto';

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly exchangeRateService: ExchangeRateService,
  ) {}

  /**
   * 微信支付预下单（REQ-041）
   */
  async wxPrepay(userId: bigint, openid: string, dto: WxPrepayDto) {
    const order = await this.prisma.order.findFirst({
      where: { id: BigInt(dto.orderId), userId },
    });
    if (!order) throw new NotFoundException('订单不存在');
    if (order.status !== 'pending_payment') {
      throw new BadRequestException('订单状态不允许支付');
    }

    const paymentNo = `PAY${uuidv4().replace(/-/g, '').toUpperCase().slice(0, 20)}`;

    // 创建支付记录
    const payment = await this.prisma.payment.create({
      data: {
        paymentNo,
        orderId: order.id,
        userId,
        amount: order.totalAmount,
        currency: 'CNY',
        method: 'wechat',
        status: 'pending',
      },
    });

    // 调用微信统一下单接口
    const appid = this.config.get('WX_APPID');
    const mchid = this.config.get('WX_MCHID');
    const notifyUrl = this.config.get('WX_NOTIFY_URL');

    // 实际项目中需要完整的微信支付V3签名，此处为骨架
    const prepayData = {
      appid,
      mchid,
      description: `校庆纪念品-${order.orderNo}`,
      out_trade_no: paymentNo,
      notify_url: notifyUrl,
      amount: {
        total: Math.round(Number(order.totalAmount) * 100), // 单位：分
        currency: 'CNY',
      },
      payer: { openid },
    };

    try {
      // TODO: 完整实现微信支付V3签名
      // const response = await this.wxPayRequest('POST', '/v3/pay/transactions/jsapi', prepayData);
      // const prepayId = response.data.prepay_id;
      const prepayId = `mock_prepay_${Date.now()}`; // 开发占位

      await this.prisma.payment.update({
        where: { id: payment.id },
        data: { wxPrepayId: prepayId },
      });

      // 返回小程序支付参数
      const timestamp = Math.floor(Date.now() / 1000).toString();
      const nonceStr = uuidv4().replace(/-/g, '');

      return {
        timeStamp: timestamp,
        nonceStr,
        package: `prepay_id=${prepayId}`,
        signType: 'RSA',
        paySign: 'mock_sign', // TODO: 实际签名
        paymentId: payment.id.toString(),
      };
    } catch (error) {
      this.logger.error('微信预下单失败', error);
      throw new BadRequestException('微信支付预下单失败，请重试');
    }
  }

  /**
   * 微信支付回调处理（REQ-042）
   */
  async wxNotify(req: Request) {
    // TODO: 验证微信支付V3签名
    // 1. 验证签名
    // 2. 解密通知数据（AES-256-GCM）
    // 3. 更新支付和订单状态

    const body = req.body as any;
    this.logger.log(`收到微信支付回调：${JSON.stringify(body)}`);

    // 成功应答
    return { code: 'SUCCESS', message: '成功' };
  }

  /**
   * 创建PayPal订单（REQ-044）
   */
  async paypalCreate(userId: bigint, dto: PaypalCreateDto) {
    const order = await this.prisma.order.findFirst({
      where: { id: BigInt(dto.orderId), userId },
    });
    if (!order) throw new NotFoundException('订单不存在');
    if (order.status !== 'pending_payment') {
      throw new BadRequestException('订单状态不允许支付');
    }

    // 获取当前汇率
    const rate = await this.exchangeRateService.getRate('USD', 'CNY');
    const usdAmount = (Number(order.totalAmount) / Number(rate.rate)).toFixed(2);

    const paymentNo = `PAY${uuidv4().replace(/-/g, '').toUpperCase().slice(0, 20)}`;

    // 创建PayPal订单
    const accessToken = await this.getPaypalAccessToken();
    const paypalBaseUrl = this.config.get('PAYPAL_BASE_URL', 'https://api-m.sandbox.paypal.com');

    try {
      const response = await axios.post(
        `${paypalBaseUrl}/v2/checkout/orders`,
        {
          intent: 'CAPTURE',
          purchase_units: [
            {
              reference_id: order.orderNo,
              amount: {
                currency_code: 'USD',
                value: usdAmount,
              },
            },
          ],
        },
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
        },
      );

      const paypalOrderId = response.data.id;

      // 创建支付记录
      const payment = await this.prisma.payment.create({
        data: {
          paymentNo,
          orderId: order.id,
          userId,
          amount: parseFloat(usdAmount),
          currency: 'USD',
          exchangeRate: rate.rate,
          method: 'paypal',
          status: 'pending',
          paypalOrderId,
        },
      });

      return {
        paypalOrderId,
        paymentId: payment.id.toString(),
        amount: usdAmount,
        currency: 'USD',
      };
    } catch (error) {
      this.logger.error('创建PayPal订单失败', error);
      throw new BadRequestException('创建PayPal支付失败，请重试');
    }
  }

  /**
   * 捕获PayPal支付（REQ-045）
   */
  async paypalCapture(userId: bigint, dto: PaypalCaptureDto) {
    const payment = await this.prisma.payment.findFirst({
      where: { paypalOrderId: dto.paypalOrderId, userId },
      include: { order: true },
    });
    if (!payment) throw new NotFoundException('支付记录不存在');

    const accessToken = await this.getPaypalAccessToken();
    const paypalBaseUrl = this.config.get('PAYPAL_BASE_URL', 'https://api-m.sandbox.paypal.com');

    try {
      const response = await axios.post(
        `${paypalBaseUrl}/v2/checkout/orders/${dto.paypalOrderId}/capture`,
        {},
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
        },
      );

      const captureId = response.data.purchase_units[0].payments.captures[0].id;

      // 更新支付和订单状态
      await this.prisma.$transaction([
        this.prisma.payment.update({
          where: { id: payment.id },
          data: {
            status: 'success',
            paypalCaptureId: captureId,
            paidAt: new Date(),
          },
        }),
        this.prisma.order.update({
          where: { id: payment.orderId },
          data: { status: 'paid', paymentId: payment.id },
        }),
      ]);

      return { status: 'success', captureId };
    } catch (error) {
      this.logger.error('捕获PayPal支付失败', error);
      throw new BadRequestException('PayPal支付捕获失败');
    }
  }

  /**
   * PayPal Webhook 处理（REQ-046）
   */
  async paypalWebhook(req: Request) {
    // TODO: 验证PayPal Webhook签名
    const event = req.body as any;
    this.logger.log(`收到PayPal Webhook：${event.event_type}`);
    return { received: true };
  }

  /**
   * 获取PayPal Access Token
   */
  private async getPaypalAccessToken(): Promise<string> {
    const clientId = this.config.get('PAYPAL_CLIENT_ID');
    const secret = this.config.get('PAYPAL_SECRET');
    const baseUrl = this.config.get('PAYPAL_BASE_URL', 'https://api-m.sandbox.paypal.com');

    const response = await axios.post(
      `${baseUrl}/v1/oauth2/token`,
      'grant_type=client_credentials',
      {
        auth: { username: clientId, password: secret },
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      },
    );
    return response.data.access_token;
  }
}

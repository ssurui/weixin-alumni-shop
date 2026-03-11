import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import nock from 'nock';
import { AppModule } from '../../src/app.module';
import { PrismaService } from '../../src/prisma/prisma.service';
import { ResponseInterceptor } from '../../src/common/interceptors/response.interceptor';
import { HttpExceptionFilter } from '../../src/common/filters/http-exception.filter';

describe('PaymentsController (PayPal e2e) - TC-051~055', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let accessToken: string;
  let userId: bigint;
  let orderId: bigint;

  const PAYPAL_BASE = 'https://api-m.sandbox.paypal.com';

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    app.useGlobalInterceptors(new ResponseInterceptor());
    app.useGlobalFilters(new HttpExceptionFilter());
    app.setGlobalPrefix('api/v1');
    await app.init();

    prisma = app.get(PrismaService);

    const user = await prisma.user.create({
      data: { openid: 'paypal_e2e_openid', isVerified: true, isOverseas: true, status: 1 },
    });
    userId = user.id;

    const order = await prisma.order.create({
      data: {
        orderNo: `XQPPTEST${Date.now()}`,
        userId,
        totalAmount: 200.00,
        currency: 'USD',
        status: 'pending_payment',
        expiresAt: new Date(Date.now() + 30 * 60 * 1000),
      },
    });
    orderId = order.id;

    nock('https://api.weixin.qq.com')
      .get('/sns/jscode2session')
      .query(true)
      .reply(200, { openid: 'paypal_e2e_openid', session_key: 'sk' });

    const loginRes = await request(app.getHttpServer())
      .post('/api/v1/auth/wx-login')
      .send({ code: 'test' });
    accessToken = loginRes.body.data.accessToken;
  });

  afterAll(async () => {
    nock.cleanAll();
    await prisma.$executeRawUnsafe('SET FOREIGN_KEY_CHECKS=0');
    await prisma.$executeRawUnsafe('DELETE FROM payments');
    await prisma.$executeRawUnsafe(`DELETE FROM orders WHERE user_id = ${userId}`);
    await prisma.$executeRawUnsafe(`DELETE FROM users WHERE id = ${userId}`);
    await app.close();
  });

  describe('POST /api/v1/payments/paypal/create', () => {
    it('TC-051: 创建PayPal订单成功', async () => {
      // Mock PayPal API
      nock(PAYPAL_BASE)
        .post('/v1/oauth2/token')
        .reply(200, { access_token: 'mock_token', token_type: 'Bearer' });

      nock(PAYPAL_BASE)
        .post('/v2/checkout/orders')
        .reply(201, {
          id: 'MOCK_PP_ORDER_ID',
          status: 'CREATED',
          links: [],
        });

      const response = await request(app.getHttpServer())
        .post('/api/v1/payments/paypal/create')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ orderId: Number(orderId) })
        .expect(201);

      expect(response.body.code).toBe(0);
      expect(response.body.data.paypalOrderId).toBe('MOCK_PP_ORDER_ID');
      expect(response.body.data.currency).toBe('USD');
    });
  });

  describe('POST /api/v1/payments/paypal/capture', () => {
    it('TC-052: 捕获PayPal支付成功', async () => {
      // 先创建支付记录
      await prisma.payment.create({
        data: {
          paymentNo: `PAY_PP_${Date.now()}`,
          orderId,
          userId,
          amount: 27.78,
          currency: 'USD',
          method: 'paypal',
          status: 'pending',
          paypalOrderId: 'MOCK_CAPTURE_ORDER_ID',
        },
      });

      nock(PAYPAL_BASE)
        .post('/v1/oauth2/token')
        .reply(200, { access_token: 'mock_token', token_type: 'Bearer' });

      nock(PAYPAL_BASE)
        .post('/v2/checkout/orders/MOCK_CAPTURE_ORDER_ID/capture')
        .reply(201, {
          id: 'MOCK_CAPTURE_ORDER_ID',
          status: 'COMPLETED',
          purchase_units: [
            {
              payments: {
                captures: [
                  { id: 'MOCK_CAPTURE_ID', status: 'COMPLETED', amount: { value: '27.78' } },
                ],
              },
            },
          ],
        });

      const response = await request(app.getHttpServer())
        .post('/api/v1/payments/paypal/capture')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ paypalOrderId: 'MOCK_CAPTURE_ORDER_ID' })
        .expect(201);

      expect(response.body.data.status).toBe('success');
    });
  });

  describe('POST /api/v1/payments/paypal/webhook', () => {
    it('TC-053: PayPal Webhook无需鉴权', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/payments/paypal/webhook')
        .send({ event_type: 'PAYMENT.CAPTURE.COMPLETED' })
        .expect(200);
    });
  });
});

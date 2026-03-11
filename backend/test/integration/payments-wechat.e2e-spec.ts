import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import nock from 'nock';
import { AppModule } from '../../src/app.module';
import { PrismaService } from '../../src/prisma/prisma.service';
import { ResponseInterceptor } from '../../src/common/interceptors/response.interceptor';
import { HttpExceptionFilter } from '../../src/common/filters/http-exception.filter';

describe('PaymentsController (微信支付 e2e) - TC-030~031', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let accessToken: string;
  let userId: bigint;
  let orderId: bigint;

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

    // 创建已认证测试用户
    const user = await prisma.user.create({
      data: { openid: 'wx_pay_e2e_openid', isVerified: true, status: 1 },
    });
    userId = user.id;

    // 创建待支付订单
    const order = await prisma.order.create({
      data: {
        orderNo: `XQWXTEST${Date.now()}`,
        userId,
        totalAmount: 99.99,
        currency: 'CNY',
        status: 'pending_payment',
        expiresAt: new Date(Date.now() + 30 * 60 * 1000),
      },
    });
    orderId = order.id;

    // 登录
    nock('https://api.weixin.qq.com')
      .get('/sns/jscode2session')
      .query(true)
      .reply(200, { openid: 'wx_pay_e2e_openid', session_key: 'sk' });

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

  describe('POST /api/v1/payments/wx/prepay', () => {
    it('TC-030: 发起微信预下单，返回支付参数', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/payments/wx/prepay')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ orderId: Number(orderId) })
        .expect(201);

      expect(response.body.code).toBe(0);
      expect(response.body.data.timeStamp).toBeDefined();
      expect(response.body.data.package).toContain('prepay_id=');
      expect(response.body.data.signType).toBe('RSA');
    });

    it('TC-030-2: 订单已支付，返回400', async () => {
      // 将订单改为已支付
      await prisma.order.update({
        where: { id: orderId },
        data: { status: 'paid' },
      });

      await request(app.getHttpServer())
        .post('/api/v1/payments/wx/prepay')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ orderId: Number(orderId) })
        .expect(400);

      // 恢复状态
      await prisma.order.update({
        where: { id: orderId },
        data: { status: 'pending_payment' },
      });
    });
  });

  describe('POST /api/v1/payments/wx/notify', () => {
    it('TC-031: 微信回调接口无需鉴权', async () => {
      // 不带 Authorization 头，也应该能访问（返回200）
      const response = await request(app.getHttpServer())
        .post('/api/v1/payments/wx/notify')
        .send({
          id: 'test_notification_id',
          event_type: 'TRANSACTION.SUCCESS',
        })
        .expect(200);

      expect(response.body.data).toBeDefined();
    });
  });

  describe('GET /api/v1/payments/exchange-rate', () => {
    it('TC-048: 获取汇率', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/payments/exchange-rate')
        .query({ from: 'USD', to: 'CNY' })
        .expect(200);

      expect(response.body.code).toBe(0);
      expect(parseFloat(response.body.data.rate)).toBeGreaterThan(0);
    });
  });
});

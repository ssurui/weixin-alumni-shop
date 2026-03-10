import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import nock from 'nock';
import { AppModule } from '../../src/app.module';
import { PrismaService } from '../../src/prisma/prisma.service';
import { ResponseInterceptor } from '../../src/common/interceptors/response.interceptor';
import { HttpExceptionFilter } from '../../src/common/filters/http-exception.filter';

describe('AfterSalesController (e2e) - TC-080~087', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let accessToken: string;
  let userId: bigint;
  let completedOrderId: bigint;

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
      data: { openid: 'aftersale_e2e_openid', isVerified: true, status: 1 },
    });
    userId = user.id;

    // 创建已完成订单
    const order = await prisma.order.create({
      data: {
        orderNo: `XQASTEST${Date.now()}`,
        userId,
        totalAmount: 199.99,
        status: 'completed',
        updatedAt: new Date(),
      },
    });
    completedOrderId = order.id;

    nock('https://api.weixin.qq.com')
      .get('/sns/jscode2session')
      .query(true)
      .reply(200, { openid: 'aftersale_e2e_openid', session_key: 'sk' });

    const loginRes = await request(app.getHttpServer())
      .post('/api/v1/auth/wx-login')
      .send({ code: 'test' });
    accessToken = loginRes.body.data.accessToken;
  });

  afterAll(async () => {
    nock.cleanAll();
    await prisma.$executeRawUnsafe('DELETE FROM after_sales');
    await prisma.$executeRawUnsafe(`DELETE FROM orders WHERE user_id = ${userId}`);
    await prisma.$executeRawUnsafe(`DELETE FROM users WHERE id = ${userId}`);
    await app.close();
  });

  describe('POST /api/v1/after-sales', () => {
    it('TC-080: 正常申请售后', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/after-sales')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          orderId: Number(completedOrderId),
          type: 'refund',
          reason: '商品损坏，申请退款',
        })
        .expect(201);

      expect(response.body.data.status).toBe('pending');
      expect(response.body.data.afterSaleNo).toBeDefined();
    });

    it('TC-082: 重复申请售后，返回409', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/after-sales')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          orderId: Number(completedOrderId),
          type: 'refund',
          reason: '重复申请',
        })
        .expect(409);
    });
  });

  describe('GET /api/v1/after-sales', () => {
    it('TC-085: 获取售后申请列表', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/after-sales')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body.data).toBeInstanceOf(Array);
      expect(response.body.data.length).toBeGreaterThanOrEqual(1);
    });
  });
});

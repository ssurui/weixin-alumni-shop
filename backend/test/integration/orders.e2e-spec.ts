import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import nock from 'nock';
import { AppModule } from '../../src/app.module';
import { PrismaService } from '../../src/prisma/prisma.service';
import { ResponseInterceptor } from '../../src/common/interceptors/response.interceptor';
import { HttpExceptionFilter } from '../../src/common/filters/http-exception.filter';

describe('OrdersController (e2e) - TC-028~036', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let accessToken: string;
  let userId: bigint;
  let addressId: bigint;
  let skuId: bigint;
  let productId: bigint;

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

    // 准备测试数据：已认证用户
    const user = await prisma.user.create({
      data: { openid: 'order_e2e_openid', nickname: '下单测试用户', isVerified: true, status: 1 },
    });
    userId = user.id;

    const address = await prisma.address.create({
      data: {
        userId,
        receiverName: '张三',
        phone: '13800138000',
        province: '北京市',
        city: '北京市',
        district: '海淀区',
        detail: '测试地址',
        isDefault: true,
      },
    });
    addressId = address.id;

    const product = await prisma.product.create({
      data: { name: '订单测试商品', price: 99.99, stock: 100, status: 'published' },
    });
    productId = product.id;

    const sku = await prisma.productSku.create({
      data: {
        productId,
        skuCode: 'ORDER_TEST_SKU',
        price: 99.99,
        stock: 100,
        status: 1,
      },
    });
    skuId = sku.id;

    // 登录获取token（mock微信）
    nock('https://api.weixin.qq.com')
      .get('/sns/jscode2session')
      .query(true)
      .reply(200, { openid: 'order_e2e_openid', session_key: 'sk' });

    const loginRes = await request(app.getHttpServer())
      .post('/api/v1/auth/wx-login')
      .send({ code: 'test' });
    accessToken = loginRes.body.data.accessToken;
  });

  afterAll(async () => {
    nock.cleanAll();
    await prisma.$executeRawUnsafe('DELETE FROM order_items');
    await prisma.$executeRawUnsafe(`DELETE FROM orders WHERE user_id = ${userId}`);
    await prisma.$executeRawUnsafe(`DELETE FROM addresses WHERE user_id = ${userId}`);
    await prisma.$executeRawUnsafe(`DELETE FROM product_skus WHERE sku_code = 'ORDER_TEST_SKU'`);
    await prisma.$executeRawUnsafe(`DELETE FROM products WHERE name = '订单测试商品'`);
    await prisma.$executeRawUnsafe(`DELETE FROM users WHERE id = ${userId}`);
    await app.close();
  });

  describe('POST /api/v1/orders', () => {
    it('TC-028: 已认证用户正常创建订单', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/orders')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          addressId: Number(addressId),
          items: [{ skuId: Number(skuId), quantity: 1 }],
        })
        .expect(201);

      expect(response.body.code).toBe(0);
      expect(response.body.data.orderNo).toMatch(/^XQ\d{14}$/);
      expect(response.body.data.status).toBe('pending_payment');
    });

    it('TC-029: 未认证用户下单，返回403', async () => {
      // 创建未认证用户
      const unverifiedUser = await prisma.user.create({
        data: { openid: 'unverified_e2e', isVerified: false, status: 1 },
      });

      nock('https://api.weixin.qq.com')
        .get('/sns/jscode2session')
        .query(true)
        .reply(200, { openid: 'unverified_e2e', session_key: 'sk' });

      const loginRes = await request(app.getHttpServer())
        .post('/api/v1/auth/wx-login')
        .send({ code: 'test' });
      const unverifiedToken = loginRes.body.data.accessToken;

      await request(app.getHttpServer())
        .post('/api/v1/orders')
        .set('Authorization', `Bearer ${unverifiedToken}`)
        .send({
          addressId: Number(addressId),
          items: [{ skuId: Number(skuId), quantity: 1 }],
        })
        .expect(403);

      await prisma.user.delete({ where: { id: unverifiedUser.id } });
    });
  });

  describe('GET /api/v1/orders', () => {
    it('TC-032: 获取订单列表', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/orders')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body.data.list).toBeInstanceOf(Array);
    });
  });
});

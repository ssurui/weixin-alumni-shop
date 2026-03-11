import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import nock from 'nock';
import { AppModule } from '../../src/app.module';
import { PrismaService } from '../../src/prisma/prisma.service';
import { ResponseInterceptor } from '../../src/common/interceptors/response.interceptor';
import { HttpExceptionFilter } from '../../src/common/filters/http-exception.filter';

describe('ReviewsController (e2e) - TC-090~096', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let accessToken: string;
  let userId: bigint;
  let productId: bigint;
  let orderId: bigint;
  let orderItemId: bigint;

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
      data: { openid: 'review_e2e_openid', isVerified: true, status: 1 },
    });
    userId = user.id;

    const product = await prisma.product.create({
      data: { name: '评价测试商品', price: 99.00, stock: 50, status: 'published' },
    });
    productId = product.id;

    const sku = await prisma.productSku.create({
      data: { productId, skuCode: 'REVIEW_TEST_SKU', price: 99.00, stock: 50, status: 1 },
    });

    const order = await prisma.order.create({
      data: {
        orderNo: `XQRVTEST${Date.now()}`,
        userId,
        totalAmount: 99.00,
        status: 'completed',
      },
    });
    orderId = order.id;

    const orderItem = await prisma.orderItem.create({
      data: {
        orderId,
        productId,
        skuId: sku.id,
        quantity: 1,
        unitPrice: 99.00,
        subtotal: 99.00,
      },
    });
    orderItemId = orderItem.id;

    nock('https://api.weixin.qq.com')
      .get('/sns/jscode2session')
      .query(true)
      .reply(200, { openid: 'review_e2e_openid', session_key: 'sk' });

    const loginRes = await request(app.getHttpServer())
      .post('/api/v1/auth/wx-login')
      .send({ code: 'test' });
    accessToken = loginRes.body.data.accessToken;
  });

  afterAll(async () => {
    nock.cleanAll();
    await prisma.$executeRawUnsafe('SET FOREIGN_KEY_CHECKS=0');
    await prisma.$executeRawUnsafe('DELETE FROM review_images');
    await prisma.$executeRawUnsafe('DELETE FROM reviews');
    await prisma.$executeRawUnsafe('DELETE FROM order_items');
    await prisma.$executeRawUnsafe(`DELETE FROM orders WHERE user_id = ${userId}`);
    await prisma.$executeRawUnsafe(`DELETE FROM product_skus WHERE sku_code = 'REVIEW_TEST_SKU'`);
    await prisma.$executeRawUnsafe(`DELETE FROM products WHERE name = '评价测试商品'`);
    await prisma.$executeRawUnsafe(`DELETE FROM users WHERE id = ${userId}`);
    await app.close();
  });

  describe('POST /api/v1/reviews', () => {
    it('TC-090: 正常提交评价', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/reviews')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          orderItemId: Number(orderItemId),
          rating: 5,
          content: '商品非常好，值得购买！',
          isAnonymous: false,
        })
        .expect(201);

      expect(response.body.data.rating).toBe(5);
    });

    it('TC-091: 重复评价，返回409', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/reviews')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          orderItemId: Number(orderItemId),
          rating: 4,
          content: '重复评价',
        })
        .expect(409);
    });
  });

  describe('GET /api/v1/reviews/products/:productId', () => {
    it('TC-095: 获取商品评价列表（含匿名处理）', async () => {
      const response = await request(app.getHttpServer())
        .get(`/api/v1/reviews/products/${productId}`)
        .expect(200);

      expect(response.body.data.list).toBeInstanceOf(Array);
      expect(response.body.data.total).toBeGreaterThanOrEqual(1);
    });
  });
});

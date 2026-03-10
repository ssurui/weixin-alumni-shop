import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import nock from 'nock';
import { AppModule } from '../../src/app.module';
import { PrismaService } from '../../src/prisma/prisma.service';
import { ResponseInterceptor } from '../../src/common/interceptors/response.interceptor';
import { HttpExceptionFilter } from '../../src/common/filters/http-exception.filter';

describe('CartController (e2e) - TC-025~027', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let accessToken: string;
  let userId: bigint;
  let skuId: bigint;

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

    // 创建测试用户和商品
    const user = await prisma.user.create({
      data: { openid: 'cart_e2e_openid', nickname: '购物车测试用户', status: 1 },
    });
    userId = user.id;

    const product = await prisma.product.create({
      data: { name: '购物车测试商品', price: 88.00, stock: 50, status: 'published' },
    });

    const sku = await prisma.productSku.create({
      data: {
        productId: product.id,
        skuCode: 'CART_TEST_SKU_001',
        price: 88.00,
        stock: 50,
        status: 1,
      },
    });
    skuId = sku.id;

    // 登录获取 token
    nock('https://api.weixin.qq.com')
      .get('/sns/jscode2session')
      .query(true)
      .reply(200, { openid: 'cart_e2e_openid', session_key: 'sk' });

    const loginRes = await request(app.getHttpServer())
      .post('/api/v1/auth/wx-login')
      .send({ code: 'test_cart' });
    accessToken = loginRes.body.data.accessToken;
  });

  afterAll(async () => {
    nock.cleanAll();
    await prisma.$executeRawUnsafe('DELETE FROM cart_items');
    await prisma.$executeRawUnsafe('DELETE FROM carts');
    await prisma.$executeRawUnsafe(`DELETE FROM product_skus WHERE sku_code = 'CART_TEST_SKU_001'`);
    await prisma.$executeRawUnsafe(`DELETE FROM products WHERE name = '购物车测试商品'`);
    await prisma.$executeRawUnsafe(`DELETE FROM users WHERE id = ${userId}`);
    await app.close();
  });

  describe('GET /api/v1/cart', () => {
    it('TC-025: 获取空购物车', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/cart')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body.code).toBe(0);
      expect(response.body.data.items).toBeInstanceOf(Array);
    });
  });

  describe('POST /api/v1/cart/items', () => {
    it('TC-026: 正常加入购物车', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/cart/items')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ skuId: Number(skuId), quantity: 2 })
        .expect(201);

      expect(response.body.code).toBe(0);
      expect(response.body.data.quantity).toBe(2);
    });

    it('TC-027: 超出库存上限，返回400', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/cart/items')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ skuId: Number(skuId), quantity: 9999 })
        .expect(400);
    });

    it('TC-027-2: 重复加购，数量累加', async () => {
      // 清空购物车后重新加购
      await request(app.getHttpServer())
        .delete('/api/v1/cart')
        .set('Authorization', `Bearer ${accessToken}`);

      await request(app.getHttpServer())
        .post('/api/v1/cart/items')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ skuId: Number(skuId), quantity: 1 });

      const response = await request(app.getHttpServer())
        .post('/api/v1/cart/items')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ skuId: Number(skuId), quantity: 1 })
        .expect(200);

      expect(response.body.data.quantity).toBe(2);
    });
  });
});

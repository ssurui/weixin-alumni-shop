import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import nock from 'nock';
import { AppModule } from '../../src/app.module';
import { PrismaService } from '../../src/prisma/prisma.service';
import { ResponseInterceptor } from '../../src/common/interceptors/response.interceptor';
import { HttpExceptionFilter } from '../../src/common/filters/http-exception.filter';

describe('Orders Concurrency (e2e) - TC-037', () => {
  let app: INestApplication;
  let prisma: PrismaService;

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
  });

  afterAll(async () => {
    nock.cleanAll();
    await app.close();
  });

  it('TC-037: 10并发下单，库存仅5时最多5个成功，无超卖', async () => {
    // 创建库存为5的商品
    const product = await prisma.product.create({
      data: { name: '并发测试商品', price: 50, stock: 5, status: 'published' },
    });
    const sku = await prisma.productSku.create({
      data: {
        productId: product.id,
        skuCode: 'CONCUR_TEST_SKU',
        price: 50,
        stock: 5,
        status: 1,
      },
    });

    // 创建10个测试用户并行登录
    const tokens: string[] = [];
    const addressIds: number[] = [];

    for (let i = 0; i < 10; i++) {
      const user = await prisma.user.create({
        data: { openid: `concur_user_${i}`, isVerified: true, status: 1 },
      });
      const address = await prisma.address.create({
        data: {
          userId: user.id,
          receiverName: `用户${i}`,
          phone: '13800138000',
          detail: '测试地址',
        },
      });
      addressIds.push(Number(address.id));

      nock('https://api.weixin.qq.com')
        .get('/sns/jscode2session')
        .query(true)
        .reply(200, { openid: `concur_user_${i}`, session_key: 'sk' });

      const loginRes = await request(app.getHttpServer())
        .post('/api/v1/auth/wx-login')
        .send({ code: 'test' });
      tokens.push(loginRes.body.data.accessToken);
    }

    // 10并发下单
    const orderPromises = tokens.map((token, i) =>
      request(app.getHttpServer())
        .post('/api/v1/orders')
        .set('Authorization', `Bearer ${token}`)
        .send({
          addressId: addressIds[i],
          items: [{ skuId: Number(sku.id), quantity: 1 }],
        }),
    );

    const results = await Promise.all(orderPromises);

    const successCount = results.filter((r) => r.status === 201).length;
    const failCount = results.filter((r) => r.status !== 201).length;

    expect(successCount).toBeLessThanOrEqual(5);
    expect(failCount).toBeGreaterThanOrEqual(5);

    // 验证数据库库存不为负
    const updatedSku = await prisma.productSku.findUnique({ where: { id: sku.id } });
    expect(Number(updatedSku?.stock)).toBeGreaterThanOrEqual(0);

    // 清理
    await prisma.$executeRawUnsafe('DELETE FROM order_items');
    await prisma.$executeRawUnsafe(`DELETE FROM orders WHERE order_no LIKE 'XQ%'`);
    await prisma.$executeRawUnsafe(`DELETE FROM addresses WHERE receiver_name LIKE '用户%'`);
    await prisma.$executeRawUnsafe(`DELETE FROM users WHERE openid LIKE 'concur_user_%'`);
    await prisma.$executeRawUnsafe(`DELETE FROM product_skus WHERE sku_code = 'CONCUR_TEST_SKU'`);
    await prisma.$executeRawUnsafe(`DELETE FROM products WHERE name = '并发测试商品'`);
  }, 30000); // 超时30秒
});

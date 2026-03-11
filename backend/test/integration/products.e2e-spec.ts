import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../../src/app.module';
import { PrismaService } from '../../src/prisma/prisma.service';
import { ResponseInterceptor } from '../../src/common/interceptors/response.interceptor';
import { HttpExceptionFilter } from '../../src/common/filters/http-exception.filter';

describe('ProductsController (e2e) - TC-020~024', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let testProductId: bigint;

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

    // 创建测试数据
    const product = await prisma.product.create({
      data: {
        name: '测试纪念徽章',
        price: 99.99,
        stock: 100,
        status: 'published',
        sortOrder: 10,
      },
    });
    testProductId = product.id;

    await prisma.productSku.create({
      data: {
        productId: testProductId,
        skuCode: 'TEST_SKU_001',
        price: 99.99,
        stock: 100,
        status: 1,
        specValues: { color: '金色' },
      },
    });
  });

  afterAll(async () => {
    await prisma.$executeRawUnsafe('SET FOREIGN_KEY_CHECKS=0');
    await prisma.$executeRawUnsafe('DELETE FROM product_skus WHERE sku_code LIKE "TEST_%"');
    await prisma.$executeRawUnsafe('DELETE FROM products WHERE name LIKE "测试%"');
    await app.close();
  });

  describe('GET /api/v1/products', () => {
    it('TC-020: 获取商品列表，返回分页数据', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/products')
        .query({ page: 1, pageSize: 10 })
        .expect(200);

      expect(response.body.code).toBe(0);
      expect(response.body.data.list).toBeInstanceOf(Array);
      expect(response.body.data.total).toBeGreaterThanOrEqual(1);
      expect(response.body.data.page).toBe(1);
    });

    it('TC-021: 关键词搜索商品', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/products')
        .query({ keyword: '纪念徽章' })
        .expect(200);

      expect(response.body.data.list.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('GET /api/v1/products/:id', () => {
    it('TC-022: 获取已发布商品详情', async () => {
      const response = await request(app.getHttpServer())
        .get(`/api/v1/products/${testProductId}`)
        .expect(200);

      expect(response.body.data.name).toBe('测试纪念徽章');
      expect(response.body.data.skus).toBeInstanceOf(Array);
    });

    it('TC-023: 商品不存在，返回404', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/products/999999999')
        .expect(404);
    });
  });
});

import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import nock from 'nock';
import { AppModule } from '../../src/app.module';
import { PrismaService } from '../../src/prisma/prisma.service';
import { ResponseInterceptor } from '../../src/common/interceptors/response.interceptor';
import { HttpExceptionFilter } from '../../src/common/filters/http-exception.filter';

describe('CustomizationController (e2e) - TC-070~077', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let accessToken: string;
  let userId: bigint;
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

    const user = await prisma.user.create({
      data: { openid: 'custom_e2e_openid', isVerified: true, status: 1 },
    });
    userId = user.id;

    const product = await prisma.product.create({
      data: { name: '定制刻字测试商品', price: 199.00, stock: 50, status: 'published', isCustomizable: true },
    });
    productId = product.id;

    nock('https://api.weixin.qq.com')
      .get('/sns/jscode2session')
      .query(true)
      .reply(200, { openid: 'custom_e2e_openid', session_key: 'sk' });

    const loginRes = await request(app.getHttpServer())
      .post('/api/v1/auth/wx-login')
      .send({ code: 'test' });
    accessToken = loginRes.body.data.accessToken;
  });

  afterAll(async () => {
    nock.cleanAll();
    await prisma.$executeRawUnsafe(`DELETE FROM customizations WHERE user_id = ${userId}`);
    await prisma.$executeRawUnsafe(`DELETE FROM products WHERE name = '定制刻字测试商品'`);
    await prisma.$executeRawUnsafe(`DELETE FROM users WHERE id = ${userId}`);
    await app.close();
  });

  describe('GET /api/v1/customization/fonts', () => {
    it('TC-070: 获取字体列表', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/customization/fonts')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body.data).toBeInstanceOf(Array);
      expect(response.body.data.length).toBeGreaterThan(0);
      expect(response.body.data[0]).toHaveProperty('name');
    });
  });

  describe('POST /api/v1/customization/validate', () => {
    it('TC-071: 合法刻字内容校验通过', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/customization/validate')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ text: '校庆纪念2026' })
        .expect(201);

      expect(response.body.data.valid).toBe(true);
      expect(response.body.data.charCount).toBe(8);
    });

    it('TC-072: 超过20字符返回400', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/customization/validate')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ text: '这是一段超过二十个字符的刻字内容用于验证字数限制' })
        .expect(400);
    });

    it('TC-073: 包含敏感词返回400', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/customization/validate')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ text: '违禁词1测试' })
        .expect(400);
    });
  });

  describe('POST /api/v1/customization/preview', () => {
    it('TC-075: 生成刻字预览图', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/customization/preview')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          productId: Number(productId),
          textContent: '校庆2026',
          fontName: 'SimSun',
        })
        .expect(201);

      expect(response.body.data.previewImageUrl).toBeDefined();
      expect(response.body.data.textContent).toBe('校庆2026');
    });
  });
});

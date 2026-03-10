import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import * as bcrypt from 'bcryptjs';
import { AppModule } from '../../src/app.module';
import { PrismaService } from '../../src/prisma/prisma.service';
import { ResponseInterceptor } from '../../src/common/interceptors/response.interceptor';
import { HttpExceptionFilter } from '../../src/common/filters/http-exception.filter';

describe('AdminReportsController (e2e) - TC-100~106', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let adminToken: string;
  let adminId: bigint;

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

    // 创建测试管理员
    const passwordHash = await bcrypt.hash('ReportAdmin123', 10);
    const admin = await prisma.admin.create({
      data: {
        username: 'reports_e2e_admin',
        passwordHash,
        realName: '报表测试管理员',
        status: 1,
      },
    });
    adminId = admin.id;

    // 登录获取管理员 token
    const loginRes = await request(app.getHttpServer())
      .post('/api/v1/admin/login')
      .send({ username: 'reports_e2e_admin', password: 'ReportAdmin123' });
    adminToken = loginRes.body.data?.accessToken;
  });

  afterAll(async () => {
    if (adminId) {
      await prisma.admin.delete({ where: { id: adminId } });
    }
    await app.close();
  });

  describe('GET /api/v1/admin/reports/overview', () => {
    it('TC-100: 获取销售总览报表', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/admin/reports/overview')
        .set('Authorization', `Bearer ${adminToken}`)
        .query({ startDate: '2026-03-01', endDate: '2026-03-09' })
        .expect(200);

      expect(response.body.code).toBe(0);
      expect(response.body.data).toHaveProperty('totalOrders');
      expect(response.body.data).toHaveProperty('completedOrders');
      expect(response.body.data).toHaveProperty('totalRevenue');
      expect(response.body.data).toHaveProperty('newUsers');
    });
  });

  describe('GET /api/v1/admin/reports/daily-sales', () => {
    it('TC-101: 获取每日销售统计', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/admin/reports/daily-sales')
        .set('Authorization', `Bearer ${adminToken}`)
        .query({ date: '2026-03-09' })
        .expect(200);

      expect(response.body.data).toHaveProperty('orderCount');
      expect(response.body.data).toHaveProperty('revenue');
    });
  });

  describe('GET /api/v1/admin/reports/product-ranking', () => {
    it('TC-102: 获取商品销量排行', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/admin/reports/product-ranking')
        .set('Authorization', `Bearer ${adminToken}`)
        .query({ limit: 5 })
        .expect(200);

      expect(response.body.data).toBeInstanceOf(Array);
    });

    it('TC-103: 未授权访问报表，返回401', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/admin/reports/overview')
        .query({ startDate: '2026-03-01', endDate: '2026-03-09' })
        .expect(401);
    });
  });
});

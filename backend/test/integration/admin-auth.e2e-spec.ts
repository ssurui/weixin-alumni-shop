import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import * as bcrypt from 'bcryptjs';
import { AppModule } from '../../src/app.module';
import { PrismaService } from '../../src/prisma/prisma.service';
import { ResponseInterceptor } from '../../src/common/interceptors/response.interceptor';
import { HttpExceptionFilter } from '../../src/common/filters/http-exception.filter';

describe('AdminController (e2e) - TC-110~116', () => {
  let app: INestApplication;
  let prisma: PrismaService;
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

    const passwordHash = await bcrypt.hash('TestAdmin123', 10);
    const admin = await prisma.admin.create({
      data: {
        username: 'e2e_admin',
        passwordHash,
        realName: 'E2E测试管理员',
        status: 1,
      },
    });
    adminId = admin.id;
  });

  afterAll(async () => {
    await prisma.admin.delete({ where: { id: adminId } });
    await app.close();
  });

  describe('POST /api/v1/admin/login', () => {
    it('TC-110: 管理员正常登录', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/admin/login')
        .send({ username: 'e2e_admin', password: 'TestAdmin123' })
        .expect(200);

      expect(response.body.data.accessToken).toBeDefined();
      expect(response.body.data.admin.username).toBe('e2e_admin');
    });

    it('TC-111: 密码错误，返回401', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/admin/login')
        .send({ username: 'e2e_admin', password: 'WrongPassword' })
        .expect(401);
    });

    it('TC-112: 用户名不存在，返回401', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/admin/login')
        .send({ username: 'nonexistent', password: 'TestAdmin123' })
        .expect(401);
    });
  });
});

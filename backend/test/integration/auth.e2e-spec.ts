import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import nock from 'nock';
import { AppModule } from '../../src/app.module';
import { PrismaService } from '../../src/prisma/prisma.service';
import { ResponseInterceptor } from '../../src/common/interceptors/response.interceptor';
import { HttpExceptionFilter } from '../../src/common/filters/http-exception.filter';

describe('AuthController (e2e) - TC-001~012', () => {
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

  beforeEach(async () => {
    // 清理测试数据
    await prisma.$executeRawUnsafe('DELETE FROM alumni_verifications');
    await prisma.$executeRawUnsafe('DELETE FROM users');
  });

  describe('POST /api/v1/auth/wx-login', () => {
    it('TC-001: 新用户微信登录成功', async () => {
      nock('https://api.weixin.qq.com')
        .get('/sns/jscode2session')
        .query(true)
        .reply(200, { openid: 'e2e_test_openid_new', session_key: 'sk' });

      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/wx-login')
        .send({ code: 'test_code_new' })
        .expect(200);

      expect(response.body.code).toBe(0);
      expect(response.body.data.accessToken).toBeDefined();
      expect(response.body.data.user.isVerified).toBe(false);
    });

    it('TC-002: 已有账号登录，返回现有用户信息', async () => {
      // 先创建用户
      await prisma.user.create({
        data: { openid: 'e2e_existing_openid', nickname: '已有用户', status: 1 },
      });

      nock('https://api.weixin.qq.com')
        .get('/sns/jscode2session')
        .query(true)
        .reply(200, { openid: 'e2e_existing_openid', session_key: 'sk' });

      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/wx-login')
        .send({ code: 'test_code_existing' })
        .expect(200);

      expect(response.body.data.accessToken).toBeDefined();
    });

    it('TC-003: code为空，返回400', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/auth/wx-login')
        .send({})
        .expect(400);
    });

    it('TC-004: 微信API返回错误，返回401', async () => {
      nock('https://api.weixin.qq.com')
        .get('/sns/jscode2session')
        .query(true)
        .reply(200, { errcode: 40029, errmsg: 'invalid code' });

      await request(app.getHttpServer())
        .post('/api/v1/auth/wx-login')
        .send({ code: 'invalid_code' })
        .expect(401);
    });
  });

  describe('POST /api/v1/auth/alumni/apply', () => {
    let accessToken: string;

    beforeEach(async () => {
      nock('https://api.weixin.qq.com')
        .get('/sns/jscode2session')
        .query(true)
        .reply(200, { openid: 'e2e_apply_openid', session_key: 'sk' });

      const loginRes = await request(app.getHttpServer())
        .post('/api/v1/auth/wx-login')
        .send({ code: 'test_code' });
      accessToken = loginRes.body.data.accessToken;
    });

    it('TC-005: 正常提交校友认证申请', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/alumni/apply')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          realName: '张三',
          studentId: '2020001',
          graduationYear: 2024,
          major: '计算机科学',
        })
        .expect(201);

      expect(response.body.data.status).toBe('pending');
    });

    it('TC-006: 未登录访问，返回401', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/auth/alumni/apply')
        .send({ realName: '张三' })
        .expect(401);
    });
  });
});

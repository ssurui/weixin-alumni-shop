import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import nock from 'nock';
import { AppModule } from '../../src/app.module';
import { HttpExceptionFilter } from '../../src/common/filters/http-exception.filter';
import { ResponseInterceptor } from '../../src/common/interceptors/response.interceptor';

/**
 * 认证绕过与越权测试（TC-S003, TC-S007）
 */
describe('Security: Auth Bypass Tests', () => {
  let app: INestApplication;
  let user1Token: string;
  let user1Id: bigint;

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

    nock('https://api.weixin.qq.com')
      .get('/sns/jscode2session')
      .query(true)
      .reply(200, { openid: 'sec_user1', session_key: 'sk' });

    const loginRes = await request(app.getHttpServer())
      .post('/api/v1/auth/wx-login')
      .send({ code: 'test' });
    user1Token = loginRes.body.data?.accessToken;
  });

  afterAll(async () => {
    nock.cleanAll();
    await app.close();
  });

  describe('TC-S003: 无token访问受保护接口', () => {
    it('无token访问购物车，返回401', async () => {
      await request(app.getHttpServer()).get('/api/v1/cart').expect(401);
    });

    it('无token访问订单列表，返回401', async () => {
      await request(app.getHttpServer()).get('/api/v1/orders').expect(401);
    });

    it('无token访问通知列表，返回401', async () => {
      await request(app.getHttpServer()).get('/api/v1/notifications').expect(401);
    });
  });

  describe('TC-S007: JWT伪造防护', () => {
    it('使用伪造token访问，返回401', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/orders')
        .set('Authorization', 'Bearer fake.jwt.token')
        .expect(401);
    });

    it('使用过期token访问，返回401', async () => {
      const expiredToken =
        'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxIiwib3BlbmlkIjoidGVzdCIsImlhdCI6MTYwMDAwMDAwMCwiZXhwIjoxNjAwMDAwMDAxfQ.invalid_signature';
      await request(app.getHttpServer())
        .get('/api/v1/orders')
        .set('Authorization', `Bearer ${expiredToken}`)
        .expect(401);
    });
  });
});

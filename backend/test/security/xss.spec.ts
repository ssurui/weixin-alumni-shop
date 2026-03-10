import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import nock from 'nock';
import { AppModule } from '../../src/app.module';
import { HttpExceptionFilter } from '../../src/common/filters/http-exception.filter';
import { ResponseInterceptor } from '../../src/common/interceptors/response.interceptor';

/**
 * XSS 安全测试（TC-S002）
 */
describe('Security: XSS Tests', () => {
  let app: INestApplication;
  let accessToken: string;

  const XSS_PAYLOADS = [
    '<script>alert("xss")</script>',
    '<img src=x onerror=alert(1)>',
    'javascript:alert(1)',
    '"><script>alert(document.cookie)</script>',
    '<svg onload=alert(1)>',
  ];

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

    // 创建测试用户
    nock('https://api.weixin.qq.com')
      .get('/sns/jscode2session')
      .query(true)
      .reply(200, { openid: 'xss_test_openid', session_key: 'sk' });

    const loginRes = await request(app.getHttpServer())
      .post('/api/v1/auth/wx-login')
      .send({ code: 'test' });
    accessToken = loginRes.body.data?.accessToken;
  });

  afterAll(async () => {
    nock.cleanAll();
    await app.close();
  });

  describe('TC-S002: 刻字内容XSS防护', () => {
    XSS_PAYLOADS.forEach((payload) => {
      it(`XSS防护: ${payload.substring(0, 30)}`, async () => {
        const response = await request(app.getHttpServer())
          .post('/api/v1/customization/validate')
          .set('Authorization', `Bearer ${accessToken}`)
          .send({ text: payload });

        // 不应执行脚本，响应数据中不应包含未转义的脚本标签
        if (response.body.data) {
          const responseStr = JSON.stringify(response.body.data);
          expect(responseStr).not.toContain('<script>');
        }
      });
    });
  });
});

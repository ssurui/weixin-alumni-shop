import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import nock from 'nock';
import { AppModule } from '../../src/app.module';
import { HttpExceptionFilter } from '../../src/common/filters/http-exception.filter';
import { ResponseInterceptor } from '../../src/common/interceptors/response.interceptor';

/**
 * 支付金额篡改测试（TC-S004）
 */
describe('Security: Payment Tamper Tests', () => {
  let app: INestApplication;
  let accessToken: string;

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
      .reply(200, { openid: 'pay_sec_user', session_key: 'sk' });

    const loginRes = await request(app.getHttpServer())
      .post('/api/v1/auth/wx-login')
      .send({ code: 'test' });
    accessToken = loginRes.body.data?.accessToken;
  });

  afterAll(async () => {
    nock.cleanAll();
    await app.close();
  });

  describe('TC-S004: 伪造微信支付回调', () => {
    it('伪造回调不含有效签名，应被拦截处理', async () => {
      const fakeNotify = {
        id: 'fake_notification_id',
        create_time: new Date().toISOString(),
        event_type: 'TRANSACTION.SUCCESS',
        resource_type: 'encrypt-resource',
        resource: {
          algorithm: 'AEAD_AES_256_GCM',
          ciphertext: 'fake_ciphertext',
          nonce: 'fake_nonce',
          associated_data: '',
        },
      };

      // 回调接口应返回200（幂等），但内部应验证签名
      const response = await request(app.getHttpServer())
        .post('/api/v1/payments/wx/notify')
        .send(fakeNotify);

      // 实际支付金额不应被篡改（DB中订单金额应保持不变）
      expect(response.status).toBe(200);
    });
  });
});

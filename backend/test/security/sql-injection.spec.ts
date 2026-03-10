import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../../src/app.module';
import { HttpExceptionFilter } from '../../src/common/filters/http-exception.filter';

/**
 * SQL注入安全测试（TC-S001）
 */
describe('Security: SQL Injection Tests', () => {
  let app: INestApplication;

  const SQL_INJECTION_PAYLOADS = [
    "' OR '1'='1",
    "'; DROP TABLE users; --",
    "1; SELECT * FROM users WHERE '1'='1",
    "' UNION SELECT * FROM admins --",
    "admin'--",
    "' OR 1=1--",
    "1' AND '1'='1",
    "%27 OR %271%27=%271",
  ];

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    app.useGlobalFilters(new HttpExceptionFilter());
    app.setGlobalPrefix('api/v1');
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('TC-S001: 商品搜索接口SQL注入防护', () => {
    SQL_INJECTION_PAYLOADS.forEach((payload) => {
      it(`防护payload: ${payload.substring(0, 30)}...`, async () => {
        const response = await request(app.getHttpServer())
          .get('/api/v1/products')
          .query({ keyword: payload });

        // 不应返回500（服务器错误），且响应应正常
        expect(response.status).not.toBe(500);
        expect(response.body.code).not.toBe(50000);
      });
    });
  });

  describe('TC-S001-2: 登录接口SQL注入防护', () => {
    SQL_INJECTION_PAYLOADS.forEach((payload) => {
      it(`登录注入防护: ${payload.substring(0, 20)}`, async () => {
        const response = await request(app.getHttpServer())
          .post('/api/v1/admin/login')
          .send({ username: payload, password: payload });

        expect(response.status).not.toBe(500);
      });
    });
  });
});

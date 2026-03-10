/**
 * 商品列表接口性能测试（TC-P001）
 * 500并发，响应时间<1秒
 * 运行方式：k6 run test/performance/product-list.js
 */
import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend } from 'k6/metrics';

const errorRate = new Rate('errors');
const responseTime = new Trend('response_time');

export const options = {
  stages: [
    { duration: '30s', target: 100 },  // 爬坡到100并发
    { duration: '1m', target: 500 },   // 保持500并发1分钟
    { duration: '30s', target: 0 },    // 降到0
  ],
  thresholds: {
    http_req_duration: ['p(95)<1000'],  // 95%请求<1秒（TC-P001）
    errors: ['rate<0.01'],              // 错误率<1%
  },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';

export default function () {
  // TC-P001: 商品列表接口500并发
  const response = http.get(`${BASE_URL}/api/v1/products?page=1&pageSize=20`);

  const success = check(response, {
    'status is 200': (r) => r.status === 200,
    'response time < 1s': (r) => r.timings.duration < 1000,
    'has list data': (r) => {
      const body = JSON.parse(r.body);
      return body.code === 0 && Array.isArray(body.data?.list);
    },
  });

  errorRate.add(!success);
  responseTime.add(response.timings.duration);

  sleep(1);
}

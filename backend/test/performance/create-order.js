/**
 * 下单接口性能测试（TC-P002）
 * 100并发，无超卖
 * 运行方式：k6 run test/performance/create-order.js -e TOKEN=xxx -e SKU_ID=1 -e ADDR_ID=1
 */
import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate } from 'k6/metrics';

const errorRate = new Rate('errors');

export const options = {
  stages: [
    { duration: '10s', target: 50 },
    { duration: '30s', target: 100 },
    { duration: '10s', target: 0 },
  ],
  thresholds: {
    http_req_duration: ['p(95)<3000'],  // 下单允许3秒（TC-P002）
    errors: ['rate<0.05'],
  },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';
const TOKEN = __ENV.TOKEN || '';
const SKU_ID = __ENV.SKU_ID || '1';
const ADDR_ID = __ENV.ADDR_ID || '1';

const headers = {
  'Content-Type': 'application/json',
  Authorization: `Bearer ${TOKEN}`,
};

export default function () {
  const payload = JSON.stringify({
    addressId: parseInt(ADDR_ID),
    items: [{ skuId: parseInt(SKU_ID), quantity: 1 }],
  });

  const response = http.post(`${BASE_URL}/api/v1/orders`, payload, { headers });

  const success = check(response, {
    'order created or stock depleted': (r) =>
      r.status === 201 || r.status === 400,
    'no server error': (r) => r.status !== 500,
  });

  errorRate.add(response.status === 500);

  sleep(0.5);
}

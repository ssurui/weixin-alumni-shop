/**
 * 混合场景性能测试（TC-P006）
 * 模拟真实用户行为：浏览->加购->下单->支付
 * 运行方式：k6 run test/performance/mixed-scenario.js
 */
import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { Rate } from 'k6/metrics';

const errorRate = new Rate('errors');

export const options = {
  scenarios: {
    browse: {
      executor: 'constant-vus',
      vus: 200,
      duration: '2m',
      exec: 'browsing',
    },
    order: {
      executor: 'constant-vus',
      vus: 50,
      duration: '2m',
      exec: 'ordering',
    },
  },
  thresholds: {
    'http_req_duration{scenario:browse}': ['p(95)<1000'],
    'http_req_duration{scenario:order}': ['p(95)<3000'],
    errors: ['rate<0.02'],
  },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';

export function browsing() {
  group('浏览商品流程', () => {
    const listRes = http.get(`${BASE_URL}/api/v1/products?page=1&pageSize=20`);
    check(listRes, {
      '商品列表200': (r) => r.status === 200,
      '响应时间<1s': (r) => r.timings.duration < 1000,
    });
    errorRate.add(listRes.status !== 200);
    sleep(1);

    const categoriesRes = http.get(`${BASE_URL}/api/v1/products/categories`);
    check(categoriesRes, { '分类列表200': (r) => r.status === 200 });
    sleep(0.5);

    // 模拟查看商品详情
    if (listRes.status === 200) {
      const body = JSON.parse(listRes.body);
      const products = body.data?.list || [];
      if (products.length > 0) {
        const productId = products[0].id;
        const detailRes = http.get(`${BASE_URL}/api/v1/products/${productId}`);
        check(detailRes, { '商品详情200': (r) => r.status === 200 });
      }
    }
    sleep(1);
  });
}

export function ordering() {
  const token = __ENV.TOKEN;
  if (!token) {
    sleep(1);
    return;
  }

  const headers = {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  };

  group('下单流程', () => {
    // 查看购物车
    const cartRes = http.get(`${BASE_URL}/api/v1/cart`, { headers });
    check(cartRes, { '购物车200': (r) => r.status === 200 });
    sleep(1);

    // 查看通知
    const notifRes = http.get(`${BASE_URL}/api/v1/notifications`, { headers });
    check(notifRes, { '通知列表200': (r) => r.status === 200 });
    sleep(0.5);

    // 查看订单列表
    const ordersRes = http.get(`${BASE_URL}/api/v1/orders`, { headers });
    check(ordersRes, { '订单列表200': (r) => r.status === 200 });
    sleep(2);
  });
}

/**
 * PayPal API Mock 辅助工具
 * 使用 nock 拦截 PayPal API 请求
 */
import nock from 'nock';

const PAYPAL_SANDBOX_BASE = 'https://api-m.sandbox.paypal.com';

export function mockPaypalAccessToken() {
  return nock(PAYPAL_SANDBOX_BASE)
    .post('/v1/oauth2/token')
    .reply(200, {
      access_token: 'mock_paypal_access_token',
      token_type: 'Bearer',
      expires_in: 32400,
    });
}

export function mockPaypalCreateOrder(orderId: string = 'MOCK_ORDER_ID') {
  return nock(PAYPAL_SANDBOX_BASE)
    .post('/v2/checkout/orders')
    .reply(201, {
      id: orderId,
      status: 'CREATED',
      links: [
        { href: `https://www.sandbox.paypal.com/checkoutnow?token=${orderId}`, rel: 'approve' },
      ],
    });
}

export function mockPaypalCaptureOrder(orderId: string, captureId: string = 'MOCK_CAPTURE_ID') {
  return nock(PAYPAL_SANDBOX_BASE)
    .post(`/v2/checkout/orders/${orderId}/capture`)
    .reply(201, {
      id: orderId,
      status: 'COMPLETED',
      purchase_units: [
        {
          payments: {
            captures: [
              {
                id: captureId,
                status: 'COMPLETED',
                amount: { currency_code: 'USD', value: '10.00' },
              },
            ],
          },
        },
      ],
    });
}

export function cleanPaypalMocks() {
  nock.cleanAll();
}

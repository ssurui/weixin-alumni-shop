/**
 * 支付记录测试数据工厂
 */
import { PrismaClient } from '@prisma/client';

export async function createWechatPayment(
  prisma: PrismaClient,
  orderId: bigint,
  userId: bigint,
  overrides: any = {},
) {
  return prisma.payment.create({
    data: {
      paymentNo: `PAY_WX_${Date.now()}`,
      orderId,
      userId,
      amount: 199.98,
      currency: 'CNY',
      method: 'wechat',
      status: 'pending',
      ...overrides,
    },
  });
}

export async function createPaypalPayment(
  prisma: PrismaClient,
  orderId: bigint,
  userId: bigint,
  overrides: any = {},
) {
  return prisma.payment.create({
    data: {
      paymentNo: `PAY_PP_${Date.now()}`,
      orderId,
      userId,
      amount: 27.78,
      currency: 'USD',
      exchangeRate: 7.2,
      method: 'paypal',
      status: 'pending',
      paypalOrderId: `PP_ORDER_${Date.now()}`,
      ...overrides,
    },
  });
}

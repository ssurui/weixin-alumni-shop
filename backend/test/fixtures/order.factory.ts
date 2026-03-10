/**
 * 订单测试数据工厂
 */
import { PrismaClient } from '@prisma/client';
import dayjs from 'dayjs';

export async function createAddress(prisma: PrismaClient, userId: bigint, overrides: any = {}) {
  return prisma.address.create({
    data: {
      userId,
      receiverName: '张三',
      phone: '13800138000',
      province: '北京市',
      city: '北京市',
      district: '海淀区',
      detail: '中关村大街1号',
      isDefault: true,
      ...overrides,
    },
  });
}

export async function createOrder(
  prisma: PrismaClient,
  userId: bigint,
  addressId: bigint,
  overrides: any = {},
) {
  const orderNo = `XQTEST${Date.now()}`;
  return prisma.order.create({
    data: {
      orderNo,
      userId,
      totalAmount: 199.98,
      currency: 'CNY',
      addressId,
      status: 'pending_payment',
      expiresAt: dayjs().add(30, 'minute').toDate(),
      ...overrides,
    },
  });
}

export async function createOrderItem(
  prisma: PrismaClient,
  orderId: bigint,
  productId: bigint,
  skuId: bigint,
  overrides: any = {},
) {
  return prisma.orderItem.create({
    data: {
      orderId,
      productId,
      skuId,
      quantity: 2,
      unitPrice: 99.99,
      subtotal: 199.98,
      ...overrides,
    },
  });
}

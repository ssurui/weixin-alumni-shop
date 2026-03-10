/**
 * 用户测试数据工厂
 */
import { PrismaClient } from '@prisma/client';

export async function createDomesticUser(prisma: PrismaClient, overrides: any = {}) {
  return prisma.user.create({
    data: {
      openid: `test_openid_domestic_${Date.now()}`,
      nickname: '测试国内校友',
      isOverseas: false,
      isVerified: true,
      status: 1,
      ...overrides,
    },
  });
}

export async function createOverseasUser(prisma: PrismaClient, overrides: any = {}) {
  return prisma.user.create({
    data: {
      openid: `test_openid_overseas_${Date.now()}`,
      nickname: '测试海外校友',
      isOverseas: true,
      isVerified: true,
      countryCode: '+1',
      status: 1,
      ...overrides,
    },
  });
}

export async function createUnverifiedUser(prisma: PrismaClient, overrides: any = {}) {
  return prisma.user.create({
    data: {
      openid: `test_openid_unverified_${Date.now()}`,
      nickname: '未认证用户',
      isOverseas: false,
      isVerified: false,
      status: 1,
      ...overrides,
    },
  });
}

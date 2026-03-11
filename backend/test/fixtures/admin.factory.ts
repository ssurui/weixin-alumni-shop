/**
 * 管理员测试数据工厂
 */
import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

export async function createAdmin(prisma: any, overrides: any = {}) {
  const passwordHash = await bcrypt.hash('Admin123456', 10);
  return prisma.admin.create({
    data: {
      username: `test_admin_${Date.now()}`,
      passwordHash,
      realName: '测试管理员',
      email: 'admin@test.com',
      status: 1,
      ...overrides,
    },
  });
}

export async function createRole(prisma: any, overrides: any = {}) {
  return prisma.role.create({
    data: {
      name: `test_role_${Date.now()}`,
      displayName: '测试角色',
      ...overrides,
    },
  });
}

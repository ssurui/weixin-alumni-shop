/**
 * 测试数据库初始化和清理工具
 */
import { PrismaClient } from '@prisma/client';

const testPrisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_TEST_URL || 'mysql://weixin_test_user:weixin_test_pass@localhost:3307/weixin_p1_test',
    },
  },
});

export async function connectTestDB() {
  await testPrisma.$connect();
  return testPrisma;
}

export async function disconnectTestDB() {
  await testPrisma.$disconnect();
}

/**
 * 清理测试数据（按依赖顺序删除）
 */
export async function cleanTestDB(prisma: PrismaClient) {
  // 按外键依赖逆序删除
  const tables = [
    'review_images',
    'reviews',
    'notifications',
    'after_sales',
    'logistics',
    'order_items',
    'customizations',
    'payments',
    'orders',
    'cart_items',
    'carts',
    'addresses',
    'product_images',
    'product_skus',
    'products',
    'product_categories',
    'alumni_verifications',
    'admin_roles',
    'role_permissions',
    'permissions',
    'roles',
    'admins',
    'users',
    'exchange_rates',
    'system_settings',
    'banners',
    'announcements',
    'report_schedules',
  ];

  for (const table of tables) {
    await prisma.$executeRawUnsafe(`DELETE FROM \`${table}\``);
  }
}

export { testPrisma };

/**
 * 商品测试数据工厂
 */
import { PrismaClient } from '@prisma/client';

export async function createProduct(prisma: PrismaClient, overrides: any = {}) {
  return prisma.product.create({
    data: {
      name: '测试纪念品',
      nameEn: 'Test Souvenir',
      description: '校庆纪念品描述',
      price: 99.99,
      stock: 100,
      status: 'published',
      isCustomizable: false,
      sortOrder: 0,
      ...overrides,
    },
  });
}

export async function createSku(
  prisma: PrismaClient,
  productId: bigint,
  overrides: any = {},
) {
  const code = `SKU_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
  return prisma.productSku.create({
    data: {
      productId,
      skuCode: code,
      price: 99.99,
      stock: 100,
      status: 1,
      specValues: { color: '红色' },
      ...overrides,
    },
  });
}

export async function createProductWithSku(
  prisma: PrismaClient,
  productOverrides: any = {},
  skuOverrides: any = {},
) {
  const product = await createProduct(prisma, productOverrides);
  const sku = await createSku(prisma, product.id, skuOverrides);
  return { product, sku };
}

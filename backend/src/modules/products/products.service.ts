import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { ProductListDto } from './dto/product-list.dto';

@Injectable()
export class ProductsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * 获取商品分类列表（REQ-016）
   */
  async getCategories() {
    const categories = await this.prisma.productCategory.findMany({
      where: { status: 1, parentId: null },
      include: { children: { where: { status: 1 } } },
      orderBy: { sortOrder: 'desc' },
    });
    return categories;
  }

  /**
   * 获取商品列表（REQ-017, REQ-018）
   */
  async getProducts(query: ProductListDto) {
    const { page = 1, pageSize = 20, categoryId, keyword } = query;
    const skip = (page - 1) * pageSize;

    const where: any = {
      status: 'published',
    };

    if (categoryId) {
      where.categoryId = BigInt(categoryId);
    }

    if (keyword) {
      where.OR = [
        { name: { contains: keyword } },
        { nameEn: { contains: keyword } },
      ];
    }

    const [total, products] = await Promise.all([
      this.prisma.product.count({ where }),
      this.prisma.product.findMany({
        where,
        include: {
          images: { orderBy: { sortOrder: 'asc' }, take: 1 },
          skus: { where: { status: 1 } },
        },
        orderBy: { sortOrder: 'desc' },
        skip,
        take: pageSize,
      }),
    ]);

    return {
      list: products,
      total,
      page,
      pageSize,
    };
  }

  /**
   * 获取商品详情（REQ-019）
   */
  async getProduct(id: bigint) {
    const product = await this.prisma.product.findUnique({
      where: { id },
      include: {
        images: { orderBy: { sortOrder: 'asc' } },
        skus: { where: { status: 1 } },
        category: true,
      },
    });

    if (!product || product.status !== 'published') {
      throw new NotFoundException('商品不存在或已下架');
    }

    return product;
  }
}

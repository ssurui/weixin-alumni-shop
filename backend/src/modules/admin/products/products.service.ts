import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';

@Injectable()
export class AdminProductsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(query: any) {
    const { page = 1, pageSize = 20, status, categoryId, keyword } = query;
    const skip = (page - 1) * pageSize;
    const where: any = {};
    if (status) where.status = status;
    if (categoryId) where.categoryId = BigInt(categoryId);
    if (keyword) where.name = { contains: keyword };

    const [total, list] = await Promise.all([
      this.prisma.product.count({ where }),
      this.prisma.product.findMany({
        where,
        include: { category: true, skus: true },
        orderBy: { sortOrder: 'desc' },
        skip,
        take: Number(pageSize),
      }),
    ]);
    return { list, total, page: Number(page), pageSize: Number(pageSize) };
  }

  async detail(id: bigint) {
    const product = await this.prisma.product.findUnique({
      where: { id },
      include: { category: true, skus: true, images: true },
    });
    if (!product) throw new NotFoundException('商品不存在');
    return product;
  }

  async create(data: any) {
    return this.prisma.product.create({ data });
  }

  async update(id: bigint, data: any) {
    const product = await this.prisma.product.findUnique({ where: { id } });
    if (!product) throw new NotFoundException('商品不存在');
    return this.prisma.product.update({ where: { id }, data });
  }

  async updateStatus(id: bigint, status: 'published' | 'unpublished') {
    const product = await this.prisma.product.findUnique({ where: { id } });
    if (!product) throw new NotFoundException('商品不存在');
    return this.prisma.product.update({ where: { id }, data: { status } });
  }
}

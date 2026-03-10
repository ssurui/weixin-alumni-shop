import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';

@Injectable()
export class AdminOrdersService {
  constructor(private readonly prisma: PrismaService) {}

  async list(status: string | undefined, keyword: string | undefined, page: number, pageSize: number) {
    const skip = (page - 1) * pageSize;
    const where: any = {};
    if (status) where.status = status;
    if (keyword) {
      where.OR = [
        { orderNo: { contains: keyword } },
        { user: { nickname: { contains: keyword } } },
      ];
    }

    const [total, list] = await Promise.all([
      this.prisma.order.count({ where }),
      this.prisma.order.findMany({
        where,
        include: {
          user: { select: { nickname: true, phone: true } },
          items: { take: 1, include: { product: { select: { name: true } } } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: pageSize,
      }),
    ]);
    return { list, total, page, pageSize };
  }

  async detail(id: bigint) {
    const order = await this.prisma.order.findUnique({
      where: { id },
      include: {
        user: true,
        items: { include: { product: true, sku: true } },
        payments: true,
        logistics: true,
        afterSales: true,
      },
    });
    if (!order) throw new NotFoundException('订单不存在');
    return order;
  }

  async ship(id: bigint, company: string, trackingNo: string) {
    const order = await this.prisma.order.findUnique({ where: { id } });
    if (!order) throw new NotFoundException('订单不存在');
    if (order.status !== 'processing') {
      throw new BadRequestException('只有处理中的订单才能发货');
    }

    await this.prisma.$transaction([
      this.prisma.logistics.create({
        data: { orderId: id, company, trackingNo, status: 'shipping', shippedAt: new Date() },
      }),
      this.prisma.order.update({
        where: { id },
        data: { status: 'shipped' },
      }),
    ]);

    return { status: 'shipped' };
  }
}

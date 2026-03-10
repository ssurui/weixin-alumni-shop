import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import dayjs from 'dayjs';

@Injectable()
export class AdminReportsService {
  constructor(private readonly prisma: PrismaService) {}

  /** 销售总览（REQ-128） */
  async overview(startDate: string, endDate: string) {
    const start = dayjs(startDate).startOf('day').toDate();
    const end = dayjs(endDate).endOf('day').toDate();

    const [totalOrders, completedOrders, totalRevenue, newUsers] = await Promise.all([
      this.prisma.order.count({
        where: { createdAt: { gte: start, lte: end } },
      }),
      this.prisma.order.count({
        where: {
          createdAt: { gte: start, lte: end },
          status: { in: ['completed', 'shipped', 'paid'] },
        },
      }),
      this.prisma.order.aggregate({
        where: {
          createdAt: { gte: start, lte: end },
          status: { in: ['completed', 'shipped', 'paid'] },
        },
        _sum: { totalAmount: true },
      }),
      this.prisma.user.count({
        where: { createdAt: { gte: start, lte: end } },
      }),
    ]);

    return {
      totalOrders,
      completedOrders,
      totalRevenue: totalRevenue._sum.totalAmount || 0,
      newUsers,
      period: { startDate, endDate },
    };
  }

  /** 每日销售统计（REQ-129） */
  async dailySales(date: string) {
    const start = dayjs(date).startOf('day').toDate();
    const end = dayjs(date).endOf('day').toDate();

    const orders = await this.prisma.order.findMany({
      where: { createdAt: { gte: start, lte: end } },
      select: { totalAmount: true, status: true, createdAt: true },
    });

    return {
      date,
      orderCount: orders.length,
      completedCount: orders.filter((o) =>
        ['completed', 'shipped', 'paid'].includes(o.status),
      ).length,
      revenue: orders
        .filter((o) => ['completed', 'shipped', 'paid'].includes(o.status))
        .reduce((sum, o) => sum + Number(o.totalAmount), 0),
    };
  }

  /** 商品销量排行（REQ-130） */
  async productRanking(limit: number) {
    const ranking = await this.prisma.product.findMany({
      orderBy: { salesCount: 'desc' },
      take: Number(limit),
      select: {
        id: true,
        name: true,
        salesCount: true,
        coverImage: true,
        price: true,
      },
    });
    return ranking;
  }
}

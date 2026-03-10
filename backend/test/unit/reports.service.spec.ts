import { Test, TestingModule } from '@nestjs/testing';
import { AdminReportsService } from '../../src/modules/admin/reports/reports.service';
import { PrismaService } from '../../src/prisma/prisma.service';

describe('AdminReportsService', () => {
  let service: AdminReportsService;
  let prisma: any;

  beforeEach(async () => {
    const mockPrisma = {
      order: {
        count: jest.fn(),
        findMany: jest.fn(),
        aggregate: jest.fn(),
      },
      user: { count: jest.fn() },
      product: { findMany: jest.fn() },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AdminReportsService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<AdminReportsService>(AdminReportsService);
    prisma = module.get(PrismaService);
  });

  describe('overview', () => {
    it('TC-100: 正确聚合日期范围内的数据', async () => {
      prisma.order.count.mockResolvedValueOnce(100).mockResolvedValueOnce(80);
      prisma.order.aggregate.mockResolvedValue({ _sum: { totalAmount: 19980.00 } });
      prisma.user.count.mockResolvedValue(50);

      const result = await service.overview('2026-03-01', '2026-03-09');

      expect(result.totalOrders).toBe(100);
      expect(result.completedOrders).toBe(80);
      expect(result.totalRevenue).toBe(19980.00);
      expect(result.newUsers).toBe(50);
    });
  });

  describe('dailySales', () => {
    it('TC-101: 每日销售数据统计准确', async () => {
      prisma.order.findMany.mockResolvedValue([
        { totalAmount: 199.98, status: 'completed', createdAt: new Date() },
        { totalAmount: 99.99, status: 'cancelled', createdAt: new Date() },
      ]);

      const result = await service.dailySales('2026-03-09');

      expect(result.orderCount).toBe(2);
      expect(result.completedCount).toBe(1);
      expect(result.revenue).toBeCloseTo(199.98);
    });
  });

  describe('productRanking', () => {
    it('TC-102: 商品排行按销量降序返回', async () => {
      prisma.product.findMany.mockResolvedValue([
        { id: BigInt(1), name: '纪念徽章', salesCount: 500 },
        { id: BigInt(2), name: '纪念T恤', salesCount: 300 },
      ]);

      const result = await service.productRanking(10);
      expect(result[0].salesCount).toBe(500);
      expect(result[1].salesCount).toBe(300);
    });
  });
});

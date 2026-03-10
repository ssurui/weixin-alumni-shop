import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { ReviewsService } from '../../src/modules/reviews/reviews.service';
import { PrismaService } from '../../src/prisma/prisma.service';

describe('ReviewsService', () => {
  let service: ReviewsService;
  let prisma: any;

  const mockOrderItem = {
    id: BigInt(1),
    orderId: BigInt(1),
    productId: BigInt(1),
    order: { id: BigInt(1), userId: BigInt(1), status: 'completed' },
  };

  beforeEach(async () => {
    const mockPrisma = {
      orderItem: { findFirst: jest.fn() },
      review: {
        findUnique: jest.fn(),
        create: jest.fn(),
        count: jest.fn(),
        findMany: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReviewsService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<ReviewsService>(ReviewsService);
    prisma = module.get(PrismaService);
  });

  describe('create', () => {
    const dto = { orderItemId: 1, rating: 5, content: '很满意' };

    it('TC-090: 正常提交评价', async () => {
      prisma.orderItem.findFirst.mockResolvedValue(mockOrderItem);
      prisma.review.findUnique.mockResolvedValue(null);
      prisma.review.create.mockResolvedValue({ id: BigInt(1), rating: 5 });

      const result = await service.create(BigInt(1), dto);
      expect(result.rating).toBe(5);
    });

    it('TC-091: 重复评价，抛出 ConflictException', async () => {
      prisma.orderItem.findFirst.mockResolvedValue(mockOrderItem);
      prisma.review.findUnique.mockResolvedValue({ id: BigInt(1) });

      await expect(service.create(BigInt(1), dto)).rejects.toThrow(ConflictException);
    });

    it('TC-092: 订单未完成，抛出 BadRequestException', async () => {
      prisma.orderItem.findFirst.mockResolvedValue({
        ...mockOrderItem,
        order: { ...mockOrderItem.order, status: 'paid' },
      });
      prisma.review.findUnique.mockResolvedValue(null);

      await expect(service.create(BigInt(1), dto)).rejects.toThrow(BadRequestException);
    });

    it('TC-093: 匿名评价正确处理', async () => {
      prisma.orderItem.findFirst.mockResolvedValue(mockOrderItem);
      prisma.review.findUnique.mockResolvedValue(null);
      prisma.review.create.mockResolvedValue({ id: BigInt(1), rating: 5, isAnonymous: true });

      const result = await service.create(BigInt(1), { ...dto, isAnonymous: true });
      expect(result).toBeDefined();
    });
  });
});

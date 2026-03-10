import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { AfterSalesService } from '../../src/modules/after-sales/after-sales.service';
import { PrismaService } from '../../src/prisma/prisma.service';
import dayjs from 'dayjs';

describe('AfterSalesService', () => {
  let service: AfterSalesService;
  let prisma: any;

  const completedOrder = {
    id: BigInt(1),
    userId: BigInt(1),
    status: 'completed',
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    const mockPrisma = {
      order: {
        findFirst: jest.fn(),
        update: jest.fn(),
      },
      afterSale: {
        findFirst: jest.fn(),
        create: jest.fn(),
        findMany: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AfterSalesService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<AfterSalesService>(AfterSalesService);
    prisma = module.get(PrismaService);
  });

  describe('apply', () => {
    const dto = { orderId: 1, type: 'refund' as const, reason: '商品损坏' };

    it('TC-080: 正常申请售后', async () => {
      prisma.order.findFirst.mockResolvedValue(completedOrder);
      prisma.afterSale.findFirst.mockResolvedValue(null);
      prisma.afterSale.create.mockResolvedValue({
        id: BigInt(1),
        afterSaleNo: `AS${Date.now()}`,
        status: 'pending',
      });
      prisma.order.update.mockResolvedValue({});

      const result = await service.apply(BigInt(1), dto);
      expect(result.status).toBe('pending');
    });

    it('TC-081: 订单不存在，抛出 NotFoundException', async () => {
      prisma.order.findFirst.mockResolvedValue(null);
      await expect(service.apply(BigInt(1), dto)).rejects.toThrow(NotFoundException);
    });

    it('TC-082: 重复申请售后，抛出 ConflictException', async () => {
      prisma.order.findFirst.mockResolvedValue(completedOrder);
      prisma.afterSale.findFirst.mockResolvedValue({ id: BigInt(1), status: 'pending' });
      await expect(service.apply(BigInt(1), dto)).rejects.toThrow(ConflictException);
    });

    it('TC-083: 超过15天时限，抛出 BadRequestException', async () => {
      const oldOrder = {
        ...completedOrder,
        updatedAt: dayjs().subtract(16, 'day').toDate(),
      };
      prisma.order.findFirst.mockResolvedValue(oldOrder);
      prisma.afterSale.findFirst.mockResolvedValue(null);

      await expect(service.apply(BigInt(1), dto)).rejects.toThrow(BadRequestException);
    });

    it('TC-084: 订单状态不符，抛出 BadRequestException', async () => {
      prisma.order.findFirst.mockResolvedValue({ ...completedOrder, status: 'pending_payment' });
      await expect(service.apply(BigInt(1), dto)).rejects.toThrow(BadRequestException);
    });
  });
});

import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { OrderTimeoutService } from '../../src/modules/orders/order-timeout.service';
import { PrismaService } from '../../src/prisma/prisma.service';
import { InventoryService } from '../../src/modules/orders/inventory.service';

jest.mock('ioredis', () => {
  return jest.fn().mockImplementation(() => ({
    zadd: jest.fn(),
    zrem: jest.fn(),
    zrangebyscore: jest.fn(),
  }));
});

describe('OrderTimeoutService', () => {
  let service: OrderTimeoutService;
  let prisma: any;
  let inventoryService: any;
  let mockRedis: any;

  const mockOrder = {
    id: BigInt(1),
    orderNo: 'XQ20260309000001',
    status: 'pending_payment',
    updatedAt: new Date(),
    items: [{ skuId: BigInt(1), quantity: 2 }],
  };

  beforeEach(async () => {
    const mockPrisma = {
      order: {
        findUnique: jest.fn(),
        update: jest.fn(),
      },
    };

    const mockInventory = {
      rollbackStock: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrderTimeoutService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: InventoryService, useValue: mockInventory },
        { provide: ConfigService, useValue: { get: jest.fn().mockReturnValue('localhost') } },
      ],
    }).compile();

    service = module.get<OrderTimeoutService>(OrderTimeoutService);
    prisma = module.get(PrismaService);
    inventoryService = module.get(InventoryService);

    const Redis = require('ioredis');
    mockRedis = Redis.mock.instances[0];
  });

  describe('enqueueTimeout', () => {
    it('TC-032: 正常入队超时订单', async () => {
      mockRedis.zadd.mockResolvedValue(1);
      const expiresAt = new Date(Date.now() + 30 * 60 * 1000);

      await service.enqueueTimeout(BigInt(1), expiresAt);

      expect(mockRedis.zadd).toHaveBeenCalledWith(
        'order:timeout',
        expect.any(Number),
        '1',
      );
    });
  });

  describe('processExpiredOrders', () => {
    it('TC-032-2: 无超时订单时不做处理', async () => {
      mockRedis.zrangebyscore.mockResolvedValue([]);

      await service.processExpiredOrders();

      expect(prisma.order.findUnique).not.toHaveBeenCalled();
    });

    it('TC-032-3: 超时订单自动取消并回滚库存', async () => {
      mockRedis.zrangebyscore.mockResolvedValue(['1']);
      mockRedis.zrem.mockResolvedValue(1);
      prisma.order.findUnique.mockResolvedValue(mockOrder);
      prisma.order.update.mockResolvedValue({ ...mockOrder, status: 'cancelled' });
      inventoryService.rollbackStock.mockResolvedValue(undefined);

      await service.processExpiredOrders();

      expect(inventoryService.rollbackStock).toHaveBeenCalledWith(BigInt(1), 2);
      expect(prisma.order.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ status: 'cancelled' }),
        }),
      );
    });

    it('TC-032-4: 已取消/已支付订单幂等不重复处理', async () => {
      mockRedis.zrangebyscore.mockResolvedValue(['1']);
      mockRedis.zrem.mockResolvedValue(1);
      prisma.order.findUnique.mockResolvedValue({ ...mockOrder, status: 'paid' });

      await service.processExpiredOrders();

      expect(inventoryService.rollbackStock).not.toHaveBeenCalled();
      expect(prisma.order.update).not.toHaveBeenCalled();
    });
  });
});

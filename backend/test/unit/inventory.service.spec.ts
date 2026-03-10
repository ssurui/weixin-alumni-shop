import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InventoryService } from '../../src/modules/orders/inventory.service';
import { PrismaService } from '../../src/prisma/prisma.service';

// Mock ioredis
jest.mock('ioredis', () => {
  return jest.fn().mockImplementation(() => ({
    eval: jest.fn(),
    incrby: jest.fn(),
    exists: jest.fn(),
    set: jest.fn(),
  }));
});

describe('InventoryService', () => {
  let service: InventoryService;
  let prisma: any;
  let mockRedis: any;

  beforeEach(async () => {
    const mockPrisma = {
      $executeRaw: jest.fn(),
      productSku: { findUnique: jest.fn() },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InventoryService,
        { provide: PrismaService, useValue: mockPrisma },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn().mockReturnValue('localhost'),
          },
        },
      ],
    }).compile();

    service = module.get<InventoryService>(InventoryService);
    prisma = module.get(PrismaService);

    // 获取mock redis实例
    const Redis = require('ioredis');
    mockRedis = Redis.mock.instances[0];
  });

  describe('deductStock', () => {
    it('TC-029: 库存充足时正常扣减（Redis命中）', async () => {
      mockRedis.eval.mockResolvedValue(8); // 扣减后剩余8

      await expect(service.deductStock(BigInt(1), 2)).resolves.not.toThrow();
      expect(mockRedis.eval).toHaveBeenCalled();
    });

    it('TC-029-2: Redis库存不足，抛出 BadRequestException', async () => {
      mockRedis.eval.mockResolvedValue(-1); // 库存不足

      await expect(service.deductStock(BigInt(1), 100)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('TC-029-3: Redis未缓存时走MySQL兜底', async () => {
      mockRedis.eval.mockResolvedValue(-2); // Redis无缓存
      prisma.$executeRaw.mockResolvedValue(1); // MySQL更新成功

      await expect(service.deductStock(BigInt(1), 2)).resolves.not.toThrow();
      expect(prisma.$executeRaw).toHaveBeenCalled();
    });

    it('TC-037: MySQL库存不足时抛出异常', async () => {
      mockRedis.eval.mockResolvedValue(-2);
      prisma.$executeRaw.mockResolvedValue(0); // 无行受影响

      await expect(service.deductStock(BigInt(1), 1000)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('rollbackStock', () => {
    it('回滚库存：Redis+MySQL同步增加', async () => {
      mockRedis.exists.mockResolvedValue(1);
      mockRedis.incrby.mockResolvedValue(10);
      prisma.$executeRaw.mockResolvedValue(1);

      await expect(service.rollbackStock(BigInt(1), 2)).resolves.not.toThrow();
      expect(mockRedis.incrby).toHaveBeenCalledWith(expect.any(String), 2);
    });

    it('Redis无缓存时只回滚MySQL', async () => {
      mockRedis.exists.mockResolvedValue(0);
      prisma.$executeRaw.mockResolvedValue(1);

      await expect(service.rollbackStock(BigInt(1), 2)).resolves.not.toThrow();
      expect(mockRedis.incrby).not.toHaveBeenCalled();
    });
  });
});

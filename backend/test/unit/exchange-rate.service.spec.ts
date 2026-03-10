import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { ExchangeRateService } from '../../src/modules/payments/exchange-rate.service';
import { PrismaService } from '../../src/prisma/prisma.service';
import Decimal from 'decimal.js';

jest.mock('ioredis', () => {
  return jest.fn().mockImplementation(() => ({
    get: jest.fn(),
    setex: jest.fn(),
    del: jest.fn(),
  }));
});

describe('ExchangeRateService', () => {
  let service: ExchangeRateService;
  let prisma: any;
  let mockRedis: any;

  beforeEach(async () => {
    const mockPrisma = {
      exchangeRate: {
        findFirst: jest.fn(),
        create: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ExchangeRateService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: ConfigService, useValue: { get: jest.fn().mockReturnValue('localhost') } },
      ],
    }).compile();

    service = module.get<ExchangeRateService>(ExchangeRateService);
    prisma = module.get(PrismaService);

    const Redis = require('ioredis');
    mockRedis = Redis.mock.instances[0];
  });

  describe('getRate', () => {
    it('TC-050: Redis命中时直接返回缓存汇率', async () => {
      mockRedis.get.mockResolvedValue(JSON.stringify({ rate: '7.2', source: 'manual' }));

      const result = await service.getRate('USD', 'CNY');

      expect(result.rate.toString()).toBe('7.2');
      expect(result.source).toBe('manual');
      expect(prisma.exchangeRate.findFirst).not.toHaveBeenCalled();
    });

    it('TC-050-2: Redis未命中时降级到数据库', async () => {
      mockRedis.get.mockResolvedValue(null);
      prisma.exchangeRate.findFirst.mockResolvedValue({
        rate: { toString: () => '7.15' },
        source: 'api',
      });
      mockRedis.setex.mockResolvedValue('OK');

      const result = await service.getRate('USD', 'CNY');

      expect(result.rate.toString()).toBe('7.15');
      expect(mockRedis.setex).toHaveBeenCalled();
    });

    it('TC-050-3: Redis和DB均无数据时返回默认值', async () => {
      mockRedis.get.mockResolvedValue(null);
      prisma.exchangeRate.findFirst.mockResolvedValue(null);

      const result = await service.getRate('USD', 'CNY');

      expect(result.source).toBe('default');
      expect(result.rate.toString()).toBe('7.2');
    });
  });

  describe('setManualRate', () => {
    it('TC-056: 手动设置汇率，更新DB和Redis', async () => {
      prisma.exchangeRate.create.mockResolvedValue({ id: BigInt(1) });
      mockRedis.setex.mockResolvedValue('OK');

      await service.setManualRate('USD', 'CNY', new Decimal('7.3'));

      expect(prisma.exchangeRate.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ source: 'manual' }),
        }),
      );
      expect(mockRedis.setex).toHaveBeenCalledWith(
        'exchange_rate:USD:CNY',
        3600,
        expect.stringContaining('7.3'),
      );
    });
  });
});

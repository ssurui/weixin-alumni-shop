import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PaymentsService } from '../../src/modules/payments/payments.service';
import { PrismaService } from '../../src/prisma/prisma.service';
import { ExchangeRateService } from '../../src/modules/payments/exchange-rate.service';

describe('PaymentsService', () => {
  let service: PaymentsService;
  let prisma: any;
  let exchangeRateService: any;

  const mockOrder = {
    id: BigInt(1),
    orderNo: 'XQ20260309000001',
    userId: BigInt(1),
    totalAmount: { toString: () => '199.98' },
    currency: 'CNY',
    status: 'pending_payment',
  };

  beforeEach(async () => {
    const mockPrisma = {
      order: { findFirst: jest.fn() },
      payment: {
        create: jest.fn(),
        update: jest.fn(),
        findFirst: jest.fn(),
      },
    };

    const mockExchangeRate = {
      getRate: jest.fn().mockResolvedValue({ rate: { toString: () => '7.2' } }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PaymentsService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: ExchangeRateService, useValue: mockExchangeRate },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn().mockReturnValue('test_value'),
          },
        },
      ],
    }).compile();

    service = module.get<PaymentsService>(PaymentsService);
    prisma = module.get(PrismaService);
    exchangeRateService = module.get(ExchangeRateService);
  });

  describe('wxPrepay', () => {
    it('TC-030: 正常发起微信预下单', async () => {
      prisma.order.findFirst.mockResolvedValue(mockOrder);
      prisma.payment.create.mockResolvedValue({ id: BigInt(1) });
      prisma.payment.update.mockResolvedValue({});

      const result = await service.wxPrepay(BigInt(1), 'test_openid', { orderId: 1 });

      expect(result.timeStamp).toBeDefined();
      expect(result.package).toContain('prepay_id=');
    });

    it('TC-030-2: 订单不存在抛出 NotFoundException', async () => {
      prisma.order.findFirst.mockResolvedValue(null);
      await expect(service.wxPrepay(BigInt(1), 'openid', { orderId: 1 })).rejects.toThrow(
        NotFoundException,
      );
    });

    it('TC-030-3: 订单状态不是待支付抛出 BadRequestException', async () => {
      prisma.order.findFirst.mockResolvedValue({ ...mockOrder, status: 'paid' });
      await expect(service.wxPrepay(BigInt(1), 'openid', { orderId: 1 })).rejects.toThrow(
        BadRequestException,
      );
    });
  });
});

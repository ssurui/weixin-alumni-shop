import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { OrderNoService } from '../../src/modules/orders/order-no.service';
import dayjs from 'dayjs';

jest.mock('ioredis', () => {
  return jest.fn().mockImplementation(() => ({
    incr: jest.fn(),
    expireat: jest.fn(),
  }));
});

describe('OrderNoService', () => {
  let service: OrderNoService;
  let mockRedis: any;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrderNoService,
        { provide: ConfigService, useValue: { get: jest.fn().mockReturnValue('localhost') } },
      ],
    }).compile();

    service = module.get<OrderNoService>(OrderNoService);

    const Redis = require('ioredis');
    mockRedis = Redis.mock.instances[0];
  });

  describe('generate', () => {
    it('TC-028: 订单号格式符合 XQ{YYYYMMDD}{6位序号}', async () => {
      mockRedis.incr.mockResolvedValue(1);
      mockRedis.expireat.mockResolvedValue(1);

      const orderNo = await service.generate();

      const today = dayjs().format('YYYYMMDD');
      expect(orderNo).toMatch(/^XQ\d{8}\d{6}$/);
      expect(orderNo).toContain(today);
      expect(orderNo).toBe(`XQ${today}000001`);
    });

    it('TC-028-2: 序号自增正确', async () => {
      mockRedis.incr.mockResolvedValueOnce(1).mockResolvedValueOnce(2).mockResolvedValueOnce(3);
      mockRedis.expireat.mockResolvedValue(1);

      const no1 = await service.generate();
      const no2 = await service.generate();
      const no3 = await service.generate();

      const today = dayjs().format('YYYYMMDD');
      expect(no1).toBe(`XQ${today}000001`);
      expect(no2).toBe(`XQ${today}000002`);
      expect(no3).toBe(`XQ${today}000003`);
    });

    it('TC-028-3: 序号超过6位时取后6位', async () => {
      mockRedis.incr.mockResolvedValue(1000001);
      mockRedis.expireat.mockResolvedValue(1);

      const orderNo = await service.generate();
      const seqPart = orderNo.slice(-6);
      expect(seqPart).toBe('000001');
    });
  });
});

import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import Redis from 'ioredis';
import Decimal from 'decimal.js';

// Redis 汇率缓存键：exchange_rate:{from}:{to}
const RATE_KEY = (from: string, to: string) => `exchange_rate:${from}:${to}`;
const RATE_TTL = 3600; // 1小时缓存

@Injectable()
export class ExchangeRateService {
  private readonly logger = new Logger(ExchangeRateService.name);
  private readonly redis: Redis;

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {
    this.redis = new Redis({
      host: config.get('REDIS_HOST', 'localhost'),
      port: config.get<number>('REDIS_PORT', 6379),
      password: config.get('REDIS_PASSWORD'),
    });
  }

  /**
   * 获取汇率（REQ-048）
   * 优先级：手动设置 > Redis缓存(1h TTL) > 数据库兜底
   */
  async getRate(from: string, to: string): Promise<{ rate: Decimal; source: string }> {
    const key = RATE_KEY(from, to);

    // 1. 检查 Redis 缓存
    const cached = await this.redis.get(key);
    if (cached) {
      const data = JSON.parse(cached);
      return {
        rate: new Decimal(data.rate),
        source: data.source,
      };
    }

    // 2. 查询数据库最新汇率（兜底）
    const latest = await this.prisma.exchangeRate.findFirst({
      where: { fromCurrency: from, toCurrency: to },
      orderBy: { createdAt: 'desc' },
    });

    if (latest) {
      const rateData = { rate: latest.rate.toString(), source: latest.source };
      await this.redis.setex(key, RATE_TTL, JSON.stringify(rateData));
      return { rate: new Decimal(latest.rate.toString()), source: latest.source };
    }

    // 3. 默认汇率（无任何配置时）
    this.logger.warn(`未找到 ${from}→${to} 汇率记录，使用默认值 7.2`);
    const defaultRate = new Decimal('7.2');
    return { rate: defaultRate, source: 'default' };
  }

  /**
   * 手动设置汇率（REQ-139）
   * 手动设置后立即更新 Redis 缓存（source: manual），优先级最高
   */
  async setManualRate(from: string, to: string, rate: Decimal): Promise<void> {
    // 写入数据库
    await this.prisma.exchangeRate.create({
      data: {
        fromCurrency: from,
        toCurrency: to,
        rate: rate.toDecimalPlaces(6),
        source: 'manual',
      },
    });

    // 更新 Redis 缓存（source=manual，标记为手动设置）
    const key = RATE_KEY(from, to);
    const rateData = { rate: rate.toString(), source: 'manual' };
    await this.redis.setex(key, RATE_TTL, JSON.stringify(rateData));

    this.logger.log(`手动设置汇率 ${from}→${to} = ${rate.toString()}`);
  }

  /**
   * 清除汇率缓存
   */
  async clearCache(from: string, to: string): Promise<void> {
    await this.redis.del(RATE_KEY(from, to));
  }
}

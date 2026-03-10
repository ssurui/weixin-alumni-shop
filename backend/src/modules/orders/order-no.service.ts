import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import dayjs from 'dayjs';

@Injectable()
export class OrderNoService {
  private readonly logger = new Logger(OrderNoService.name);
  private readonly redis: Redis;

  constructor(private readonly config: ConfigService) {
    this.redis = new Redis({
      host: config.get('REDIS_HOST', 'localhost'),
      port: config.get<number>('REDIS_PORT', 6379),
      password: config.get('REDIS_PASSWORD'),
    });
  }

  /**
   * 生成订单号（REQ-031）
   * 格式：XQ{YYYYMMDD}{6位Redis自增序号}
   * 每日序号从000001开始，Redis key 按日期设置当日23:59:59过期
   */
  async generate(): Promise<string> {
    const today = dayjs().format('YYYYMMDD');
    const key = `order:seq:${today}`;

    // Redis 自增
    const seq = await this.redis.incr(key);

    // 首次设置时，给 key 加上当日过期时间
    if (seq === 1) {
      const endOfDay = dayjs().endOf('day').unix();
      const now = dayjs().unix();
      await this.redis.expireat(key, endOfDay + 1);
    }

    // 格式化为6位序号（超过6位取后6位，实际不会出现）
    const seqStr = String(seq).padStart(6, '0').slice(-6);
    return `XQ${today}${seqStr}`;
  }
}

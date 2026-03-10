import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import { InventoryService } from './inventory.service';
import Redis from 'ioredis';

// 超时队列 Redis key
const TIMEOUT_QUEUE_KEY = 'order:timeout';

@Injectable()
export class OrderTimeoutService {
  private readonly logger = new Logger(OrderTimeoutService.name);
  private readonly redis: Redis;

  constructor(
    private readonly prisma: PrismaService,
    private readonly inventoryService: InventoryService,
    private readonly config: ConfigService,
  ) {
    this.redis = new Redis({
      host: config.get('REDIS_HOST', 'localhost'),
      port: config.get<number>('REDIS_PORT', 6379),
      password: config.get('REDIS_PASSWORD'),
    });
  }

  /**
   * 将订单加入超时队列（REQ-036）
   * 使用 Redis Sorted Set，score 为过期时间戳（秒）
   */
  async enqueueTimeout(orderId: bigint, expiresAt: Date): Promise<void> {
    const score = Math.floor(expiresAt.getTime() / 1000);
    await this.redis.zadd(TIMEOUT_QUEUE_KEY, score, orderId.toString());
    this.logger.debug(`订单 ${orderId} 已加入超时队列，过期时间：${expiresAt.toISOString()}`);
  }

  /**
   * 从超时队列移除订单
   */
  async removeFromQueue(orderId: bigint): Promise<void> {
    await this.redis.zrem(TIMEOUT_QUEUE_KEY, orderId.toString());
  }

  /**
   * 定时任务：每30秒检查并处理超时订单（REQ-036）
   */
  @Cron('*/30 * * * * *')
  async processExpiredOrders(): Promise<void> {
    const now = Math.floor(Date.now() / 1000);

    // 获取所有 score <= now 的订单ID
    const expiredOrderIds = await this.redis.zrangebyscore(
      TIMEOUT_QUEUE_KEY,
      '-inf',
      now.toString(),
    );

    if (expiredOrderIds.length === 0) return;

    this.logger.log(`发现 ${expiredOrderIds.length} 个超时订单，开始处理`);

    for (const orderIdStr of expiredOrderIds) {
      await this.cancelExpiredOrder(BigInt(orderIdStr));
    }
  }

  /**
   * 取消单个超时订单
   */
  private async cancelExpiredOrder(orderId: bigint): Promise<void> {
    try {
      const order = await this.prisma.order.findUnique({
        where: { id: orderId },
        include: { items: true },
      });

      if (!order) {
        await this.removeFromQueue(orderId);
        return;
      }

      // 幂等检查：只处理仍为待支付状态的订单
      if (order.status !== 'pending_payment') {
        await this.removeFromQueue(orderId);
        return;
      }

      // 回滚库存
      for (const item of order.items) {
        await this.inventoryService.rollbackStock(item.skuId, item.quantity);
      }

      // 更新订单状态为已取消
      await this.prisma.order.update({
        where: { id: orderId },
        data: {
          status: 'cancelled',
          cancelReason: '支付超时自动关闭',
        },
      });

      // 从队列中移除
      await this.removeFromQueue(orderId);

      this.logger.log(`订单 ${orderId} 已因超时自动取消`);
    } catch (error) {
      this.logger.error(`处理超时订单 ${orderId} 时发生错误`, error);
    }
  }
}

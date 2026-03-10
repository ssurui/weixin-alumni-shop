import {
  Injectable,
  BadRequestException,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import Redis from 'ioredis';

// Redis库存键格式：inventory:sku:{skuId}
const INVENTORY_KEY = (skuId: bigint) => `inventory:sku:${skuId}`;

// Lua脚本：原子扣减库存，库存不足时返回-1
const DEDUCT_SCRIPT = `
local key = KEYS[1]
local quantity = tonumber(ARGV[1])
local current = tonumber(redis.call('GET', key))
if current == nil then
  return -2
end
if current < quantity then
  return -1
end
return redis.call('DECRBY', key, quantity)
`;

@Injectable()
export class InventoryService {
  private readonly logger = new Logger(InventoryService.name);
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
   * 扣减库存（REQ-036）
   * 策略：Redis原子扣减 + MySQL乐观锁兜底
   */
  async deductStock(skuId: bigint, quantity: number): Promise<void> {
    const key = INVENTORY_KEY(skuId);

    // 1. 尝试 Redis 原子扣减
    const result = await this.redis.eval(
      DEDUCT_SCRIPT,
      1,
      key,
      quantity.toString(),
    ) as number;

    if (result === -1) {
      throw new BadRequestException(`库存不足：skuId=${skuId}`);
    }

    if (result === -2) {
      // Redis 中无缓存，直接走 MySQL 乐观锁
      await this.deductStockFromDB(skuId, quantity);
      return;
    }

    // 2. 同步更新 MySQL（异步，不阻塞主流程）
    this.syncStockToDB(skuId, quantity, 'deduct').catch((err) =>
      this.logger.error(`MySQL库存同步失败: skuId=${skuId}`, err),
    );
  }

  /**
   * MySQL乐观锁扣减库存
   */
  private async deductStockFromDB(skuId: bigint, quantity: number): Promise<void> {
    const result = await this.prisma.$executeRaw`
      UPDATE product_skus
      SET stock = stock - ${quantity}
      WHERE id = ${skuId} AND stock >= ${quantity}
    `;

    if (result === 0) {
      throw new BadRequestException(`库存不足：skuId=${skuId}`);
    }
  }

  /**
   * 回滚库存（取消订单/超时时使用）
   */
  async rollbackStock(skuId: bigint, quantity: number): Promise<void> {
    const key = INVENTORY_KEY(skuId);

    // Redis 回滚
    const exists = await this.redis.exists(key);
    if (exists) {
      await this.redis.incrby(key, quantity);
    }

    // MySQL 回滚
    await this.syncStockToDB(skuId, quantity, 'rollback');
  }

  /**
   * 同步库存到 MySQL
   */
  private async syncStockToDB(
    skuId: bigint,
    quantity: number,
    action: 'deduct' | 'rollback',
  ): Promise<void> {
    if (action === 'deduct') {
      await this.prisma.$executeRaw`
        UPDATE product_skus
        SET stock = stock - ${quantity}
        WHERE id = ${skuId} AND stock >= ${quantity}
      `;
    } else {
      await this.prisma.$executeRaw`
        UPDATE product_skus
        SET stock = stock + ${quantity}
        WHERE id = ${skuId}
      `;
    }
  }

  /**
   * 预热库存到 Redis
   */
  async warmupInventory(skuId: bigint): Promise<void> {
    const sku = await this.prisma.productSku.findUnique({
      where: { id: skuId },
      select: { stock: true },
    });
    if (sku) {
      const key = INVENTORY_KEY(skuId);
      await this.redis.set(key, sku.stock, 'EX', 86400); // 24小时TTL
    }
  }
}

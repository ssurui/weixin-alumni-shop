/**
 * Redis Mock 辅助工具
 * 使用 ioredis-mock 模拟 Redis 操作
 */
import RedisMock from 'ioredis-mock';

export function createMockRedis() {
  return new RedisMock();
}

export function createMockRedisWithData(data: Record<string, string>) {
  const redis = new RedisMock({ data });
  return redis;
}

// 创建支持 Lua 脚本的 Redis Mock（模拟库存扣减脚本）
export class MockRedisWithLua extends RedisMock {
  async eval(script: string, numkeys: string | number, ...args: any[]): Promise<any> {
    const key = args[0];
    const quantity = parseInt(args[1]);

    // 模拟库存扣减 Lua 脚本逻辑
    if (script.includes('DECRBY')) {
      const current = await this.get(key);
      if (current === null) return -2;
      const currentNum = parseInt(current);
      if (currentNum < quantity) return -1;
      await this.decrby(key, quantity);
      return currentNum - quantity;
    }

    return 0;
  }
}

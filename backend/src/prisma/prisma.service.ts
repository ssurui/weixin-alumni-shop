import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);

  constructor() {
    super({
      log: ['warn', 'error'],
    });
  }

  async onModuleInit() {
    try {
      await this.$connect();
      this.logger.log('数据库连接成功');
    } catch (error) {
      this.logger.error('数据库连接失败', error);
      throw error;
    }
  }

  async onModuleDestroy() {
    await this.$disconnect();
    this.logger.log('数据库连接已断开');
  }

  /**
   * 清理测试数据库（仅用于测试环境）
   */
  async cleanDatabase() {
    if (process.env.NODE_ENV !== 'test') {
      throw new Error('cleanDatabase 仅允许在测试环境中调用');
    }
    const tablenames = await this.$queryRaw<Array<{ Tables_in_db: string }>>`
      SHOW TABLES
    `;
    for (const { Tables_in_db: tablename } of tablenames) {
      await this.$executeRawUnsafe(`TRUNCATE TABLE \`${tablename}\``);
    }
  }
}

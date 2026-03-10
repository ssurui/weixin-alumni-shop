import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { ThrottlerModule } from '@nestjs/throttler';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './modules/auth/auth.module';
import { ProductsModule } from './modules/products/products.module';
import { CartModule } from './modules/cart/cart.module';
import { OrdersModule } from './modules/orders/orders.module';
import { PaymentsModule } from './modules/payments/payments.module';
import { LogisticsModule } from './modules/logistics/logistics.module';
import { AfterSalesModule } from './modules/after-sales/after-sales.module';
import { CustomizationModule } from './modules/customization/customization.module';
import { ReviewsModule } from './modules/reviews/reviews.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { AdminModule } from './modules/admin/admin.module';

@Module({
  imports: [
    // 环境配置
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    // 定时任务
    ScheduleModule.forRoot(),
    // 限流保护
    ThrottlerModule.forRoot([
      {
        ttl: 60000,
        limit: 100,
      },
    ]),
    // 数据库
    PrismaModule,
    // 业务模块
    AuthModule,
    ProductsModule,
    CartModule,
    OrdersModule,
    PaymentsModule,
    LogisticsModule,
    AfterSalesModule,
    CustomizationModule,
    ReviewsModule,
    NotificationsModule,
    AdminModule,
  ],
})
export class AppModule {}

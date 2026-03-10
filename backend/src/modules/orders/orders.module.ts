import { Module } from '@nestjs/common';
import { OrdersController } from './orders.controller';
import { OrdersService } from './orders.service';
import { InventoryService } from './inventory.service';
import { OrderNoService } from './order-no.service';
import { OrderTimeoutService } from './order-timeout.service';

@Module({
  controllers: [OrdersController],
  providers: [OrdersService, InventoryService, OrderNoService, OrderTimeoutService],
  exports: [OrdersService, InventoryService],
})
export class OrdersModule {}

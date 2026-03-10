import {
  Controller, Get, Post, Body, Param, Query,
  UseGuards, ParseIntPipe, HttpCode, HttpStatus,
} from '@nestjs/common';
import { OrdersService } from './orders.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { OrderListDto } from './dto/order-list.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@Controller('orders')
@UseGuards(JwtAuthGuard)
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  /**
   * 创建订单（REQ-031）
   * POST /api/v1/orders
   */
  @Post()
  async createOrder(
    @CurrentUser('id') userId: bigint,
    @Body() dto: CreateOrderDto,
  ) {
    return this.ordersService.createOrder(userId, dto);
  }

  /**
   * 获取订单列表（REQ-032）
   * GET /api/v1/orders
   */
  @Get()
  async getOrders(
    @CurrentUser('id') userId: bigint,
    @Query() query: OrderListDto,
  ) {
    return this.ordersService.getOrders(userId, query);
  }

  /**
   * 获取订单详情（REQ-033）
   * GET /api/v1/orders/:id
   */
  @Get(':id')
  async getOrder(
    @CurrentUser('id') userId: bigint,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.ordersService.getOrder(userId, BigInt(id));
  }

  /**
   * 取消订单（REQ-034）
   * POST /api/v1/orders/:id/cancel
   */
  @Post(':id/cancel')
  @HttpCode(HttpStatus.OK)
  async cancelOrder(
    @CurrentUser('id') userId: bigint,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.ordersService.cancelOrder(userId, BigInt(id));
  }

  /**
   * 确认收货（REQ-035）
   * POST /api/v1/orders/:id/confirm
   */
  @Post(':id/confirm')
  @HttpCode(HttpStatus.OK)
  async confirmReceived(
    @CurrentUser('id') userId: bigint,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.ordersService.confirmReceived(userId, BigInt(id));
  }
}

import {
  Controller, Get, Post, Put, Delete,
  Body, Param, UseGuards, ParseIntPipe,
} from '@nestjs/common';
import { CartService } from './cart.service';
import { AddToCartDto } from './dto/add-to-cart.dto';
import { UpdateCartItemDto } from './dto/update-cart-item.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@Controller('cart')
@UseGuards(JwtAuthGuard)
export class CartController {
  constructor(private readonly cartService: CartService) {}

  /**
   * 获取购物车（REQ-026）
   */
  @Get()
  async getCart(@CurrentUser('id') userId: bigint) {
    return this.cartService.getCart(userId);
  }

  /**
   * 加入购物车（REQ-027）
   */
  @Post('items')
  async addItem(
    @CurrentUser('id') userId: bigint,
    @Body() dto: AddToCartDto,
  ) {
    return this.cartService.addItem(userId, dto);
  }

  /**
   * 更新购物车商品数量（REQ-028）
   */
  @Put('items/:id')
  async updateItem(
    @CurrentUser('id') userId: bigint,
    @Param('id', ParseIntPipe) itemId: number,
    @Body() dto: UpdateCartItemDto,
  ) {
    return this.cartService.updateItem(userId, BigInt(itemId), dto);
  }

  /**
   * 删除购物车商品（REQ-029）
   */
  @Delete('items/:id')
  async removeItem(
    @CurrentUser('id') userId: bigint,
    @Param('id', ParseIntPipe) itemId: number,
  ) {
    return this.cartService.removeItem(userId, BigInt(itemId));
  }

  /**
   * 清空购物车（REQ-030）
   */
  @Delete()
  async clearCart(@CurrentUser('id') userId: bigint) {
    return this.cartService.clearCart(userId);
  }
}

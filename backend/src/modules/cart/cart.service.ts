import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AddToCartDto } from './dto/add-to-cart.dto';
import { UpdateCartItemDto } from './dto/update-cart-item.dto';

@Injectable()
export class CartService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * 获取或创建购物车
   */
  private async getOrCreateCart(userId: bigint) {
    let cart = await this.prisma.cart.findUnique({
      where: { userId },
    });
    if (!cart) {
      cart = await this.prisma.cart.create({ data: { userId } });
    }
    return cart;
  }

  /**
   * 获取购物车详情（REQ-026）
   */
  async getCart(userId: bigint) {
    const cart = await this.getOrCreateCart(userId);
    const items = await this.prisma.cartItem.findMany({
      where: { cartId: cart.id },
      include: {
        product: {
          select: { id: true, name: true, coverImage: true, status: true },
        },
        sku: {
          select: { id: true, price: true, stock: true, specValues: true, imageUrl: true },
        },
      },
    });
    return { id: cart.id.toString(), items };
  }

  /**
   * 加入购物车（REQ-027）
   */
  async addItem(userId: bigint, dto: AddToCartDto) {
    const cart = await this.getOrCreateCart(userId);

    // 验证商品和SKU
    const sku = await this.prisma.productSku.findUnique({
      where: { id: BigInt(dto.skuId) },
      include: { product: true },
    });
    if (!sku || sku.status !== 1 || sku.product.status !== 'published') {
      throw new NotFoundException('商品或规格不存在');
    }
    if (sku.stock < dto.quantity) {
      throw new BadRequestException('库存不足');
    }

    // 如果已存在则更新数量
    const existingItem = await this.prisma.cartItem.findUnique({
      where: { cartId_skuId: { cartId: cart.id, skuId: BigInt(dto.skuId) } },
    });

    if (existingItem) {
      const newQuantity = existingItem.quantity + dto.quantity;
      if (sku.stock < newQuantity) {
        throw new BadRequestException('超出库存限制');
      }
      return this.prisma.cartItem.update({
        where: { id: existingItem.id },
        data: { quantity: newQuantity },
      });
    }

    return this.prisma.cartItem.create({
      data: {
        cartId: cart.id,
        productId: sku.productId,
        skuId: BigInt(dto.skuId),
        quantity: dto.quantity,
        customizationText: dto.customizationText,
        selectedFont: dto.selectedFont,
      },
    });
  }

  /**
   * 更新购物车商品数量（REQ-028）
   */
  async updateItem(userId: bigint, itemId: bigint, dto: UpdateCartItemDto) {
    const cart = await this.getOrCreateCart(userId);
    const item = await this.prisma.cartItem.findFirst({
      where: { id: itemId, cartId: cart.id },
      include: { sku: true },
    });
    if (!item) {
      throw new NotFoundException('购物车商品不存在');
    }
    if (item.sku.stock < dto.quantity) {
      throw new BadRequestException('库存不足');
    }
    return this.prisma.cartItem.update({
      where: { id: itemId },
      data: { quantity: dto.quantity },
    });
  }

  /**
   * 删除购物车商品（REQ-029）
   */
  async removeItem(userId: bigint, itemId: bigint) {
    const cart = await this.getOrCreateCart(userId);
    const item = await this.prisma.cartItem.findFirst({
      where: { id: itemId, cartId: cart.id },
    });
    if (!item) {
      throw new NotFoundException('购物车商品不存在');
    }
    await this.prisma.cartItem.delete({ where: { id: itemId } });
    return null;
  }

  /**
   * 清空购物车（REQ-030）
   */
  async clearCart(userId: bigint) {
    const cart = await this.getOrCreateCart(userId);
    await this.prisma.cartItem.deleteMany({ where: { cartId: cart.id } });
    return null;
  }
}

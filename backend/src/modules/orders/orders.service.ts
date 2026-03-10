import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { InventoryService } from './inventory.service';
import { OrderNoService } from './order-no.service';
import { OrderTimeoutService } from './order-timeout.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { OrderListDto } from './dto/order-list.dto';
import dayjs from 'dayjs';

@Injectable()
export class OrdersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly inventoryService: InventoryService,
    private readonly orderNoService: OrderNoService,
    private readonly orderTimeoutService: OrderTimeoutService,
  ) {}

  /**
   * 创建订单（REQ-031）
   * 包含：校友认证校验、库存扣减、订单号生成、超时队列入队
   */
  async createOrder(userId: bigint, dto: CreateOrderDto) {
    // 1. 校验用户已完成校友认证
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('用户不存在');
    if (!user.isVerified) {
      throw new ForbiddenException('请先完成校友身份认证后再下单');
    }

    // 2. 校验地址
    const address = await this.prisma.address.findFirst({
      where: { id: BigInt(dto.addressId), userId },
    });
    if (!address) throw new NotFoundException('收货地址不存在');

    // 3. 校验并计算订单明细
    const orderItemsData: Array<{
      productId: bigint;
      skuId: bigint;
      quantity: number;
      unitPrice: any;
      subtotal: any;
      productSnapshot: any;
      skuSnapshot: any;
      customizationId?: bigint;
    }> = [];

    let totalAmount = 0;

    for (const item of dto.items) {
      const sku = await this.prisma.productSku.findUnique({
        where: { id: BigInt(item.skuId) },
        include: { product: true },
      });
      if (!sku || sku.status !== 1 || sku.product.status !== 'published') {
        throw new BadRequestException(`商品或规格不存在：skuId=${item.skuId}`);
      }

      // 4. Redis原子扣减库存
      await this.inventoryService.deductStock(BigInt(item.skuId), item.quantity);

      const unitPrice = Number(sku.price);
      const subtotal = unitPrice * item.quantity;
      totalAmount += subtotal;

      orderItemsData.push({
        productId: sku.productId,
        skuId: BigInt(item.skuId),
        quantity: item.quantity,
        unitPrice: sku.price,
        subtotal: subtotal.toFixed(2),
        productSnapshot: {
          id: sku.product.id.toString(),
          name: sku.product.name,
          coverImage: sku.product.coverImage,
        },
        skuSnapshot: {
          id: sku.id.toString(),
          skuCode: sku.skuCode,
          specValues: sku.specValues,
          price: sku.price.toString(),
        },
        customizationId: item.customizationId ? BigInt(item.customizationId) : undefined,
      });
    }

    // 5. 生成订单号
    const orderNo = await this.orderNoService.generate();

    // 6. 设置超时时间（30分钟）
    const expiresAt = dayjs().add(30, 'minute').toDate();

    // 7. 地址快照
    const addressSnapshot = {
      receiverName: address.receiverName,
      phone: address.phone,
      country: address.country,
      province: address.province,
      city: address.city,
      district: address.district,
      detail: address.detail,
      postalCode: address.postalCode,
    };

    // 8. 创建订单（事务）
    const order = await this.prisma.$transaction(async (tx) => {
      const newOrder = await tx.order.create({
        data: {
          orderNo,
          userId,
          totalAmount: totalAmount.toFixed(2),
          currency: user.isOverseas ? 'USD' : 'CNY',
          addressId: BigInt(dto.addressId),
          addressSnapshot,
          expiresAt,
          remark: dto.remark,
          items: {
            create: orderItemsData,
          },
        },
        include: { items: true },
      });
      return newOrder;
    });

    // 9. 加入超时队列
    await this.orderTimeoutService.enqueueTimeout(order.id, expiresAt);

    return {
      id: order.id.toString(),
      orderNo: order.orderNo,
      totalAmount: order.totalAmount,
      status: order.status,
      expiresAt: order.expiresAt,
    };
  }

  /**
   * 获取订单列表（REQ-032）
   */
  async getOrders(userId: bigint, query: OrderListDto) {
    const { page = 1, pageSize = 10, status } = query;
    const skip = (page - 1) * pageSize;

    const where: any = { userId };
    if (status) where.status = status;

    const [total, orders] = await Promise.all([
      this.prisma.order.count({ where }),
      this.prisma.order.findMany({
        where,
        include: {
          items: {
            include: {
              product: { select: { name: true, coverImage: true } },
              sku: { select: { specValues: true } },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: pageSize,
      }),
    ]);

    return { list: orders, total, page, pageSize };
  }

  /**
   * 获取订单详情（REQ-033）
   */
  async getOrder(userId: bigint, orderId: bigint) {
    const order = await this.prisma.order.findFirst({
      where: { id: orderId, userId },
      include: {
        items: {
          include: {
            product: true,
            sku: true,
            customization: true,
          },
        },
        logistics: true,
        afterSales: true,
        payments: { orderBy: { createdAt: 'desc' }, take: 1 },
      },
    });

    if (!order) throw new NotFoundException('订单不存在');
    return order;
  }

  /**
   * 取消订单（REQ-034）
   */
  async cancelOrder(userId: bigint, orderId: bigint) {
    const order = await this.prisma.order.findFirst({
      where: { id: orderId, userId },
      include: { items: true },
    });

    if (!order) throw new NotFoundException('订单不存在');
    if (order.status !== 'pending_payment') {
      throw new BadRequestException('只有待支付订单可以取消');
    }

    // 回滚库存
    for (const item of order.items) {
      await this.inventoryService.rollbackStock(item.skuId, item.quantity);
    }

    // 更新订单状态
    const updated = await this.prisma.order.update({
      where: { id: orderId },
      data: {
        status: 'cancelled',
        cancelReason: '用户主动取消',
      },
    });

    // 从超时队列移除
    await this.orderTimeoutService.removeFromQueue(orderId);

    return { status: updated.status };
  }

  /**
   * 确认收货（REQ-035）
   */
  async confirmReceived(userId: bigint, orderId: bigint) {
    const order = await this.prisma.order.findFirst({
      where: { id: orderId, userId },
    });

    if (!order) throw new NotFoundException('订单不存在');
    if (order.status !== 'shipped') {
      throw new BadRequestException('只有已发货订单可以确认收货');
    }

    const updated = await this.prisma.order.update({
      where: { id: orderId },
      data: { status: 'completed' },
    });

    return { status: updated.status };
  }
}

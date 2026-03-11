import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { ApplyAfterSaleDto } from './dto/apply-after-sale.dto';
import dayjs from 'dayjs';

// 允许申请售后的天数（订单完成后）
const AFTER_SALE_DAYS = 15;

@Injectable()
export class AfterSalesService {
  constructor(private readonly prisma: PrismaService) {}

  /** 申请售后（REQ-054） */
  async apply(userId: bigint, dto: ApplyAfterSaleDto) {
    const order = await this.prisma.order.findFirst({
      where: { id: BigInt(dto.orderId), userId },
    });
    if (!order) throw new NotFoundException('订单不存在');

    // 检查是否重复申请（优先于状态检查，返回正确的409）
    const existing = await this.prisma.afterSale.findFirst({
      where: {
        orderId: BigInt(dto.orderId),
        userId,
        status: { in: ['pending', 'approved'] },
      },
    });
    if (existing) throw new ConflictException('已存在进行中的售后申请');

    if (!['completed', 'shipped'].includes(order.status)) {
      throw new BadRequestException('当前订单状态不支持申请售后');
    }

    // 检查是否超期（完成后15天内）
    if (order.status === 'completed') {
      const deadline = dayjs(order.updatedAt).add(AFTER_SALE_DAYS, 'day');
      if (dayjs().isAfter(deadline)) {
        throw new BadRequestException(`售后申请已超过${AFTER_SALE_DAYS}天时限`);
      }
    }

    // 生成售后编号
    const afterSaleNo = `AS${Date.now()}`;

    const afterSale = await this.prisma.afterSale.create({
      data: {
        afterSaleNo,
        orderId: BigInt(dto.orderId),
        userId,
        type: dto.type,
        reason: dto.reason,
        images: dto.images,
        orderItemId: dto.orderItemId ? BigInt(dto.orderItemId) : undefined,
      },
    });

    // 更新订单状态为售后中
    await this.prisma.order.update({
      where: { id: BigInt(dto.orderId) },
      data: { status: 'refunding' },
    });

    return { id: afterSale.id.toString(), afterSaleNo, status: afterSale.status };
  }

  async list(userId: bigint) {
    return this.prisma.afterSale.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async detail(userId: bigint, id: bigint) {
    const afterSale = await this.prisma.afterSale.findFirst({
      where: { id, userId },
    });
    if (!afterSale) throw new NotFoundException('售后记录不存在');
    return afterSale;
  }
}

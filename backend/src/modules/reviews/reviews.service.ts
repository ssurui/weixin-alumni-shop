import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateReviewDto } from './dto/create-review.dto';

@Injectable()
export class ReviewsService {
  constructor(private readonly prisma: PrismaService) {}

  /** 提交评价（REQ-066） */
  async create(userId: bigint, dto: CreateReviewDto) {
    // 校验订单明细存在且属于该用户
    const orderItem = await this.prisma.orderItem.findFirst({
      where: { id: BigInt(dto.orderItemId) },
      include: { order: true },
    });
    if (!orderItem || orderItem.order.userId !== userId) {
      throw new NotFoundException('订单明细不存在');
    }
    if (orderItem.order.status !== 'completed') {
      throw new BadRequestException('只有已完成的订单才能评价');
    }

    // 检查重复评价
    const existing = await this.prisma.review.findUnique({
      where: { orderItemId: BigInt(dto.orderItemId) },
    });
    if (existing) throw new ConflictException('该商品已评价，请勿重复提交');

    const review = await this.prisma.review.create({
      data: {
        orderId: orderItem.orderId,
        orderItemId: BigInt(dto.orderItemId),
        userId,
        productId: orderItem.productId,
        rating: dto.rating,
        content: dto.content,
        isAnonymous: dto.isAnonymous ?? false,
        images: dto.images
          ? {
              create: dto.images.map((url, i) => ({ imageUrl: url, sortOrder: i })),
            }
          : undefined,
      },
    });

    return { id: review.id.toString(), rating: review.rating };
  }

  /** 获取商品评价列表（REQ-067） */
  async getProductReviews(productId: bigint, page: number, pageSize: number) {
    const skip = (page - 1) * pageSize;
    const [total, reviews] = await Promise.all([
      this.prisma.review.count({ where: { productId, status: 1 } }),
      this.prisma.review.findMany({
        where: { productId, status: 1 },
        include: {
          images: { orderBy: { sortOrder: 'asc' } },
          user: {
            select: { nickname: true, avatarUrl: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: pageSize,
      }),
    ]);

    // 匿名处理
    const list = reviews.map((r) => ({
      ...r,
      user: r.isAnonymous ? { nickname: '匿名用户', avatarUrl: null } : r.user,
    }));

    return { list, total, page, pageSize };
  }
}

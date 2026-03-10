import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class NotificationsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(userId: bigint, page: number, pageSize: number) {
    const skip = (page - 1) * pageSize;
    const [total, list] = await Promise.all([
      this.prisma.notification.count({ where: { userId } }),
      this.prisma.notification.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        skip,
        take: pageSize,
      }),
    ]);
    return { list, total, page, pageSize };
  }

  async markRead(userId: bigint, id: bigint) {
    const notification = await this.prisma.notification.findFirst({
      where: { id, userId },
    });
    if (!notification) throw new NotFoundException('通知不存在');
    await this.prisma.notification.update({
      where: { id },
      data: { isRead: true, readAt: new Date() },
    });
    return null;
  }

  async markAllRead(userId: bigint) {
    await this.prisma.notification.updateMany({
      where: { userId, isRead: false },
      data: { isRead: true, readAt: new Date() },
    });
    return null;
  }

  async unreadCount(userId: bigint) {
    const count = await this.prisma.notification.count({
      where: { userId, isRead: false },
    });
    return { count };
  }

  /** 创建通知（内部使用） */
  async createNotification(
    userId: bigint,
    type: string,
    title: string,
    content?: string,
    extraData?: any,
  ) {
    return this.prisma.notification.create({
      data: { userId, type, title, content, extraData },
    });
  }
}

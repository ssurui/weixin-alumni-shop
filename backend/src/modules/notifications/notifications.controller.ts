import { Controller, Get, Post, Param, Query, UseGuards, ParseIntPipe, HttpCode, HttpStatus } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@Controller('notifications')
@UseGuards(JwtAuthGuard)
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  /** 获取通知列表（REQ-073） */
  @Get()
  async list(
    @CurrentUser('id') userId: bigint,
    @Query('page') page: number = 1,
    @Query('pageSize') pageSize: number = 20,
  ) {
    return this.notificationsService.list(userId, page, pageSize);
  }

  /** 标记已读（REQ-074） */
  @Post(':id/read')
  @HttpCode(HttpStatus.OK)
  async markRead(
    @CurrentUser('id') userId: bigint,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.notificationsService.markRead(userId, BigInt(id));
  }

  /** 全部标记已读（REQ-075） */
  @Post('read-all')
  @HttpCode(HttpStatus.OK)
  async markAllRead(@CurrentUser('id') userId: bigint) {
    return this.notificationsService.markAllRead(userId);
  }

  /** 获取未读数量（REQ-076） */
  @Get('unread-count')
  async unreadCount(@CurrentUser('id') userId: bigint) {
    return this.notificationsService.unreadCount(userId);
  }
}

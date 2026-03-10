import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { AdminReportsService } from './reports.service';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { Roles } from '../../../common/decorators/roles.decorator';

@Controller('admin/reports')
@UseGuards(JwtAuthGuard)
@Roles('super_admin', 'analyst')
export class AdminReportsController {
  constructor(private readonly reportsService: AdminReportsService) {}

  /** 销售总览（REQ-128） */
  @Get('overview')
  async overview(@Query('startDate') startDate: string, @Query('endDate') endDate: string) {
    return this.reportsService.overview(startDate, endDate);
  }

  /** 每日销售统计（REQ-129） */
  @Get('daily-sales')
  async dailySales(@Query('date') date: string) {
    return this.reportsService.dailySales(date);
  }

  /** 商品销量排行（REQ-130） */
  @Get('product-ranking')
  async productRanking(@Query('limit') limit: number = 10) {
    return this.reportsService.productRanking(limit);
  }
}

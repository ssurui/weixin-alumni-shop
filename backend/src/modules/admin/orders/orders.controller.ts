import { Controller, Get, Put, Body, Param, Query, UseGuards, ParseIntPipe } from '@nestjs/common';
import { AdminOrdersService } from './orders.service';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { Roles } from '../../../common/decorators/roles.decorator';

@Controller('admin/orders')
@UseGuards(JwtAuthGuard)
@Roles('super_admin', 'order_manager')
export class AdminOrdersController {
  constructor(private readonly ordersService: AdminOrdersService) {}

  @Get()
  async list(
    @Query('status') status?: string,
    @Query('page') page: number = 1,
    @Query('pageSize') pageSize: number = 20,
    @Query('keyword') keyword?: string,
  ) {
    return this.ordersService.list(status, keyword, page, pageSize);
  }

  @Get(':id')
  async detail(@Param('id', ParseIntPipe) id: number) {
    return this.ordersService.detail(BigInt(id));
  }

  @Put(':id/ship')
  async ship(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { company: string; trackingNo: string },
  ) {
    return this.ordersService.ship(BigInt(id), body.company, body.trackingNo);
  }
}

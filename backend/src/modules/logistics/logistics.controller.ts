import {
  Controller, Get, Post, Put, Delete,
  Body, Param, UseGuards, ParseIntPipe,
} from '@nestjs/common';
import { LogisticsService } from './logistics.service';
import { CreateAddressDto } from './dto/create-address.dto';
import { UpdateAddressDto } from './dto/update-address.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@Controller('logistics')
@UseGuards(JwtAuthGuard)
export class LogisticsController {
  constructor(private readonly logisticsService: LogisticsService) {}

  // ===== 收货地址管理（REQ-049~052） =====

  @Get('addresses')
  async getAddresses(@CurrentUser('id') userId: bigint) {
    return this.logisticsService.getAddresses(userId);
  }

  @Post('addresses')
  async createAddress(
    @CurrentUser('id') userId: bigint,
    @Body() dto: CreateAddressDto,
  ) {
    return this.logisticsService.createAddress(userId, dto);
  }

  @Put('addresses/:id')
  async updateAddress(
    @CurrentUser('id') userId: bigint,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateAddressDto,
  ) {
    return this.logisticsService.updateAddress(userId, BigInt(id), dto);
  }

  @Delete('addresses/:id')
  async deleteAddress(
    @CurrentUser('id') userId: bigint,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.logisticsService.deleteAddress(userId, BigInt(id));
  }

  // ===== 物流追踪（REQ-053） =====

  @Get('orders/:orderId/track')
  async trackOrder(
    @CurrentUser('id') userId: bigint,
    @Param('orderId', ParseIntPipe) orderId: number,
  ) {
    return this.logisticsService.trackOrder(userId, BigInt(orderId));
  }
}

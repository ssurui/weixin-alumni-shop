import { Controller, Get, Post, Body, Param, UseGuards, ParseIntPipe } from '@nestjs/common';
import { AfterSalesService } from './after-sales.service';
import { ApplyAfterSaleDto } from './dto/apply-after-sale.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@Controller('after-sales')
@UseGuards(JwtAuthGuard)
export class AfterSalesController {
  constructor(private readonly afterSalesService: AfterSalesService) {}

  /** 申请售后（REQ-054） */
  @Post()
  async apply(
    @CurrentUser('id') userId: bigint,
    @Body() dto: ApplyAfterSaleDto,
  ) {
    return this.afterSalesService.apply(userId, dto);
  }

  /** 获取售后列表（REQ-055） */
  @Get()
  async list(@CurrentUser('id') userId: bigint) {
    return this.afterSalesService.list(userId);
  }

  /** 获取售后详情（REQ-056） */
  @Get(':id')
  async detail(
    @CurrentUser('id') userId: bigint,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.afterSalesService.detail(userId, BigInt(id));
  }
}

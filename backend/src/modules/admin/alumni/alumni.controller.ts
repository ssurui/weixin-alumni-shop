import { Controller, Get, Put, Body, Param, Query, UseGuards, ParseIntPipe } from '@nestjs/common';
import { AdminAlumniService } from './alumni.service';
import { ReviewAlumniDto } from './dto/review-alumni.dto';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { Roles } from '../../../common/decorators/roles.decorator';

@Controller('admin/alumni')
@UseGuards(JwtAuthGuard)
@Roles('super_admin', 'alumni_manager')
export class AdminAlumniController {
  constructor(private readonly alumniService: AdminAlumniService) {}

  /** 获取校友认证申请列表（REQ-086） */
  @Get('verifications')
  async list(
    @Query('status') status?: string,
    @Query('page') page: number = 1,
    @Query('pageSize') pageSize: number = 20,
  ) {
    return this.alumniService.list(status, page, pageSize);
  }

  /** 审核校友认证申请（REQ-087） */
  @Put('verifications/:id/review')
  async review(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ReviewAlumniDto,
  ) {
    return this.alumniService.review(BigInt(id), dto);
  }
}

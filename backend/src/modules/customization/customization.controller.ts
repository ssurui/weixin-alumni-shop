import { Controller, Get, Post, Body, UseGuards } from '@nestjs/common';
import { CustomizationService } from './customization.service';
import { ValidateTextDto } from './dto/validate-text.dto';
import { CreatePreviewDto } from './dto/create-preview.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@Controller('customization')
@UseGuards(JwtAuthGuard)
export class CustomizationController {
  constructor(private readonly customizationService: CustomizationService) {}

  /** 获取可用字体列表（REQ-059） */
  @Get('fonts')
  async getFonts() {
    return this.customizationService.getFonts();
  }

  /** 校验刻字内容（REQ-060） */
  @Post('validate')
  async validateText(@Body() dto: ValidateTextDto) {
    return this.customizationService.validateText(dto);
  }

  /** 生成刻字预览（REQ-061） */
  @Post('preview')
  async createPreview(
    @CurrentUser('id') userId: bigint,
    @Body() dto: CreatePreviewDto,
  ) {
    return this.customizationService.createPreview(userId, dto);
  }
}

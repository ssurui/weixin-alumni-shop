import { Controller, Post, Get, Body, UseGuards, HttpCode, HttpStatus } from '@nestjs/common';
import { AuthService } from './auth.service';
import { WxLoginDto } from './dto/wx-login.dto';
import { AlumniApplyDto } from './dto/alumni-apply.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Public } from '../../common/decorators/public.decorator';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  /**
   * 微信登录（REQ-001）
   * POST /api/v1/auth/wx-login
   */
  @Public()
  @Post('wx-login')
  @HttpCode(HttpStatus.OK)
  async wxLogin(@Body() dto: WxLoginDto) {
    return this.authService.wxLogin(dto);
  }

  /**
   * 刷新 Token（REQ-004）
   * POST /api/v1/auth/refresh-token
   */
  @Public()
  @Post('refresh-token')
  @HttpCode(HttpStatus.OK)
  async refreshToken(@Body() dto: RefreshTokenDto) {
    return this.authService.refreshToken(dto.refreshToken);
  }

  /**
   * 提交校友认证申请（REQ-005）
   * POST /api/v1/auth/alumni/apply
   */
  @UseGuards(JwtAuthGuard)
  @Post('alumni/apply')
  async applyAlumni(
    @CurrentUser('id') userId: bigint,
    @Body() dto: AlumniApplyDto,
  ) {
    return this.authService.applyAlumni(userId, dto);
  }

  /**
   * 查询校友认证状态（REQ-006）
   * GET /api/v1/auth/alumni/status
   */
  @UseGuards(JwtAuthGuard)
  @Get('alumni/status')
  async getAlumniStatus(@CurrentUser('id') userId: bigint) {
    return this.authService.getAlumniStatus(userId);
  }
}

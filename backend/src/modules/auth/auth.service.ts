import { Injectable, UnauthorizedException, ConflictException, BadRequestException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import { WxLoginDto } from './dto/wx-login.dto';
import { AlumniApplyDto } from './dto/alumni-apply.dto';
import axios from 'axios';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
  ) {}

  /**
   * 微信登录（REQ-001）
   * 1. 用 code 换取 openid
   * 2. 查找或创建用户
   * 3. 签发 JWT Token
   */
  async wxLogin(dto: WxLoginDto) {
    const { code } = dto;

    // 调用微信 code2session 接口
    const appid = this.config.get('WX_APPID');
    const secret = this.config.get('WX_SECRET');
    const url = `https://api.weixin.qq.com/sns/jscode2session?appid=${appid}&secret=${secret}&js_code=${code}&grant_type=authorization_code`;

    let openid: string;
    let unionId: string | undefined;

    // 开发模式：未配置 AppID 时跳过微信 API，用 code 作为 openid
    if (!appid || appid === 'undefined') {
      console.warn('[WxLogin] 开发模式：未配置 WX_APPID，使用 code 作为 openid');
      openid = `dev_${code}`;
    } else {
      try {
        const response = await axios.get(url);
        const data = response.data;
        if (data.errcode) {
          console.error('[WxLogin] 微信API错误:', data.errcode, data.errmsg);
          throw new UnauthorizedException(`微信登录失败：${data.errmsg}`);
        }
        openid = data.openid;
        unionId = data.unionid;
      } catch (error) {
        if (error instanceof UnauthorizedException) throw error;
        throw new UnauthorizedException('微信登录请求失败');
      }
    }

    // 查找或创建用户
    let user = await this.prisma.user.findUnique({ where: { openid } });
    if (!user) {
      user = await this.prisma.user.create({
        data: {
          openid,
          unionId,
          nickname: dto.nickname,
          avatarUrl: dto.avatarUrl,
        },
      });
    }

    if (user.status === 0) {
      throw new UnauthorizedException('账号已被禁用');
    }

    // 签发 JWT Token
    const payload = { sub: user.id.toString(), openid: user.openid };
    const accessToken = this.jwtService.sign(payload);

    return {
      accessToken,
      user: {
        id: user.id.toString(),
        nickname: user.nickname,
        avatarUrl: user.avatarUrl,
        isVerified: user.isVerified,
        isOverseas: user.isOverseas,
      },
    };
  }

  /**
   * 刷新 Token（REQ-004）
   */
  async refreshToken(refreshToken: string) {
    try {
      const payload = this.jwtService.verify(refreshToken);
      const user = await this.prisma.user.findUnique({
        where: { id: BigInt(payload.sub) },
      });
      if (!user || user.status === 0) {
        throw new UnauthorizedException('用户不存在或已禁用');
      }
      const newPayload = { sub: user.id.toString(), openid: user.openid };
      return { accessToken: this.jwtService.sign(newPayload) };
    } catch {
      throw new UnauthorizedException('Token 无效或已过期');
    }
  }

  /**
   * 提交校友认证申请（REQ-005）
   */
  async applyAlumni(userId: bigint, dto: AlumniApplyDto) {
    // 检查是否已有待审核或已通过的申请
    const existing = await this.prisma.alumniVerification.findFirst({
      where: {
        userId,
        status: { in: ['pending', 'approved'] },
      },
    });
    if (existing) {
      throw new ConflictException('已有进行中的认证申请，请勿重复提交');
    }

    const verification = await this.prisma.alumniVerification.create({
      data: {
        userId,
        realName: dto.realName,
        studentId: dto.studentId,
        graduationYear: dto.graduationYear,
        major: dto.major,
        proofImageUrl: dto.proofImageUrl,
      },
    });

    return { id: verification.id.toString(), status: verification.status };
  }

  /**
   * 查询校友认证状态（REQ-006）
   */
  async getAlumniStatus(userId: bigint) {
    const verification = await this.prisma.alumniVerification.findFirst({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
    if (!verification) {
      return { status: 'not_applied' };
    }
    return {
      id: verification.id.toString(),
      status: verification.status,
      reviewRemark: verification.reviewRemark,
      reviewedAt: verification.reviewedAt,
    };
  }

  /**
   * 根据用户ID查找用户（供 JWT Strategy 使用）
   */
  async findAdminById(id: bigint) {
    return this.prisma.admin.findUnique({ where: { id } });
  }

  async findUserById(id: bigint) {
    return this.prisma.user.findUnique({ where: { id } });
  }
}

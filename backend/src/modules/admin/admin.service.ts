import {
  Injectable,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../../prisma/prisma.service';
import { AdminLoginDto } from './dto/admin-login.dto';
import * as bcrypt from 'bcryptjs';

// 最大登录失败次数（REQ-081）
const MAX_LOGIN_ATTEMPTS = 5;

@Injectable()
export class AdminService {
  private readonly logger = new Logger(AdminService.name);
  // 简单内存计数器（生产中应用 Redis）
  private loginAttempts = new Map<string, { count: number; lockedUntil?: Date }>();

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  /** 管理员登录（REQ-079, REQ-081） */
  async login(dto: AdminLoginDto) {
    const { username, password } = dto;

    // 检查账号锁定
    const attemptInfo = this.loginAttempts.get(username);
    if (attemptInfo?.lockedUntil && new Date() < attemptInfo.lockedUntil) {
      throw new UnauthorizedException('账号已被锁定，请15分钟后重试');
    }

    const admin = await this.prisma.admin.findUnique({
      where: { username },
      include: {
        adminRoles: {
          include: {
            role: {
              include: {
                rolePermissions: {
                  include: { permission: true },
                },
              },
            },
          },
        },
      },
    });

    if (!admin || admin.status !== 1) {
      this.recordFailedAttempt(username);
      throw new UnauthorizedException('用户名或密码错误');
    }

    const isPasswordValid = await bcrypt.compare(password, admin.passwordHash);
    if (!isPasswordValid) {
      this.recordFailedAttempt(username);
      throw new UnauthorizedException('用户名或密码错误');
    }

    // 登录成功，清除失败记录
    this.loginAttempts.delete(username);

    // 更新最后登录时间
    await this.prisma.admin.update({
      where: { id: admin.id },
      data: { lastLoginAt: new Date() },
    });

    // 提取权限列表
    const roles = admin.adminRoles.map((ar) => ar.role.name);
    const permissions = admin.adminRoles
      .flatMap((ar) => ar.role.rolePermissions)
      .map((rp) => rp.permission.name);

    const payload = {
      sub: admin.id.toString(),
      username: admin.username,
      roles,
      isAdmin: true,
    };

    return {
      accessToken: this.jwtService.sign(payload),
      admin: {
        id: admin.id.toString(),
        username: admin.username,
        realName: admin.realName,
        roles,
        permissions,
      },
    };
  }

  async logout(adminId: bigint) {
    return null; // JWT无状态，客户端删除token即可
  }

  private recordFailedAttempt(username: string) {
    const info = this.loginAttempts.get(username) || { count: 0 };
    info.count += 1;
    if (info.count >= MAX_LOGIN_ATTEMPTS) {
      info.lockedUntil = new Date(Date.now() + 15 * 60 * 1000); // 锁定15分钟
      this.logger.warn(`管理员账号 ${username} 因多次登录失败已被锁定`);
    }
    this.loginAttempts.set(username, info);
  }
}

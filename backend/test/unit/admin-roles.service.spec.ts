import { Test, TestingModule } from '@nestjs/testing';
import { UnauthorizedException } from '@nestjs/common';
import { AdminService } from '../../src/modules/admin/admin.service';
import { PrismaService } from '../../src/prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';

describe('AdminService (RBAC)', () => {
  let service: AdminService;
  let prisma: any;

  const mockAdminWithRoles = {
    id: BigInt(1),
    username: 'admin',
    passwordHash: '',
    realName: '超级管理员',
    status: 1,
    adminRoles: [
      {
        role: {
          name: 'super_admin',
          rolePermissions: [
            { permission: { name: 'order:manage' } },
            { permission: { name: 'user:manage' } },
          ],
        },
      },
    ],
  };

  beforeEach(async () => {
    mockAdminWithRoles.passwordHash = await bcrypt.hash('Admin123456', 10);

    const mockPrisma = {
      admin: {
        findUnique: jest.fn(),
        update: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AdminService,
        { provide: PrismaService, useValue: mockPrisma },
        {
          provide: JwtService,
          useValue: { sign: jest.fn().mockReturnValue('admin_token') },
        },
      ],
    }).compile();

    service = module.get<AdminService>(AdminService);
    prisma = module.get(PrismaService);
  });

  describe('login', () => {
    it('TC-112: 管理员正常登录，返回token和权限列表', async () => {
      prisma.admin.findUnique.mockResolvedValue(mockAdminWithRoles);
      prisma.admin.update.mockResolvedValue({});

      const result = await service.login({ username: 'admin', password: 'Admin123456' });

      expect(result.accessToken).toBe('admin_token');
      expect(result.admin.roles).toContain('super_admin');
      expect(result.admin.permissions).toContain('order:manage');
    });

    it('TC-113: 密码错误，抛出 UnauthorizedException', async () => {
      prisma.admin.findUnique.mockResolvedValue(mockAdminWithRoles);

      await expect(
        service.login({ username: 'admin', password: 'WrongPassword' }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('TC-114: 连续5次失败后账号锁定', async () => {
      prisma.admin.findUnique.mockResolvedValue(mockAdminWithRoles);

      // 前4次失败
      for (let i = 0; i < 4; i++) {
        await expect(
          service.login({ username: 'testlock', password: 'wrong' }),
        ).rejects.toThrow(UnauthorizedException);
      }

      // 第5次触发锁定
      await expect(
        service.login({ username: 'testlock', password: 'wrong' }),
      ).rejects.toThrow(UnauthorizedException);

      // 第6次提示账号已锁定
      await expect(
        service.login({ username: 'testlock', password: 'wrong' }),
      ).rejects.toThrow('账号已被锁定');
    });
  });
});

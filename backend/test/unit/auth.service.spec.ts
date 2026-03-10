import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { UnauthorizedException, ConflictException } from '@nestjs/common';
import { AuthService } from '../../src/modules/auth/auth.service';
import { PrismaService } from '../../src/prisma/prisma.service';
import nock from 'nock';

describe('AuthService', () => {
  let service: AuthService;
  let prisma: any;
  let jwtService: JwtService;

  const mockUser = {
    id: BigInt(1),
    openid: 'test_openid',
    unionId: null,
    nickname: '测试用户',
    avatarUrl: null,
    isVerified: false,
    isOverseas: false,
    status: 1,
  };

  beforeEach(async () => {
    const mockPrisma = {
      user: {
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
      alumniVerification: {
        findFirst: jest.fn(),
        create: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: PrismaService,
          useValue: mockPrisma,
        },
        {
          provide: JwtService,
          useValue: {
            sign: jest.fn().mockReturnValue('mock_jwt_token'),
            verify: jest.fn().mockReturnValue({ sub: '1', openid: 'test_openid' }),
          },
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string, defaultVal?: any) => {
              const config: Record<string, any> = {
                WX_APPID: 'test_appid',
                WX_SECRET: 'test_secret',
              };
              return config[key] ?? defaultVal;
            }),
          },
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    prisma = module.get(PrismaService);
    jwtService = module.get<JwtService>(JwtService);
  });

  afterEach(() => {
    nock.cleanAll();
  });

  describe('wxLogin', () => {
    it('TC-001: 新用户微信登录，应创建用户并返回token', async () => {
      // 模拟微信 code2session
      nock('https://api.weixin.qq.com')
        .get('/sns/jscode2session')
        .query(true)
        .reply(200, { openid: 'new_openid', session_key: 'sk' });

      prisma.user.findUnique.mockResolvedValue(null);
      prisma.user.create.mockResolvedValue({ ...mockUser, openid: 'new_openid' });

      const result = await service.wxLogin({ code: 'test_code' });

      expect(prisma.user.create).toHaveBeenCalledTimes(1);
      expect(result.accessToken).toBe('mock_jwt_token');
      expect(result.user).toBeDefined();
    });

    it('TC-002: 已存在用户微信登录，应直接返回token', async () => {
      nock('https://api.weixin.qq.com')
        .get('/sns/jscode2session')
        .query(true)
        .reply(200, { openid: 'test_openid', session_key: 'sk' });

      prisma.user.findUnique.mockResolvedValue(mockUser);

      const result = await service.wxLogin({ code: 'test_code' });

      expect(prisma.user.create).not.toHaveBeenCalled();
      expect(result.accessToken).toBe('mock_jwt_token');
    });

    it('TC-003: 账号被禁用，应抛出 UnauthorizedException', async () => {
      nock('https://api.weixin.qq.com')
        .get('/sns/jscode2session')
        .query(true)
        .reply(200, { openid: 'test_openid', session_key: 'sk' });

      prisma.user.findUnique.mockResolvedValue({ ...mockUser, status: 0 });

      await expect(service.wxLogin({ code: 'test_code' })).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('TC-004: 微信API返回错误，应抛出 UnauthorizedException', async () => {
      nock('https://api.weixin.qq.com')
        .get('/sns/jscode2session')
        .query(true)
        .reply(200, { errcode: 40029, errmsg: 'invalid code' });

      await expect(service.wxLogin({ code: 'invalid_code' })).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });

  describe('applyAlumni', () => {
    const dto = {
      realName: '张三',
      studentId: '2020001',
      graduationYear: 2024,
      major: '计算机科学',
    };

    it('TC-005: 正常提交校友认证申请', async () => {
      prisma.alumniVerification.findFirst.mockResolvedValue(null);
      prisma.alumniVerification.create.mockResolvedValue({
        id: BigInt(1),
        status: 'pending',
      });

      const result = await service.applyAlumni(BigInt(1), dto);

      expect(result.status).toBe('pending');
      expect(prisma.alumniVerification.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ realName: '张三' }),
        }),
      );
    });

    it('TC-006: 已有进行中申请，应抛出 ConflictException', async () => {
      prisma.alumniVerification.findFirst.mockResolvedValue({
        id: BigInt(1),
        status: 'pending',
      });

      await expect(service.applyAlumni(BigInt(1), dto)).rejects.toThrow(
        ConflictException,
      );
    });
  });

  describe('refreshToken', () => {
    it('TC-007: 有效token刷新，返回新token', async () => {
      prisma.user.findUnique.mockResolvedValue(mockUser);

      const result = await service.refreshToken('valid_token');
      expect(result.accessToken).toBe('mock_jwt_token');
    });

    it('TC-008: 无效token，抛出 UnauthorizedException', async () => {
      (jwtService.verify as jest.Mock).mockImplementation(() => {
        throw new Error('invalid token');
      });

      await expect(service.refreshToken('invalid_token')).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });
});

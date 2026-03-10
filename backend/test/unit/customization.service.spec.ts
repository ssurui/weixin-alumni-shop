import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { CustomizationService } from '../../src/modules/customization/customization.service';
import { PrismaService } from '../../src/prisma/prisma.service';

describe('CustomizationService', () => {
  let service: CustomizationService;
  let prisma: any;

  beforeEach(async () => {
    const mockPrisma = {
      customization: {
        create: jest.fn(),
        update: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CustomizationService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<CustomizationService>(CustomizationService);
    prisma = module.get(PrismaService);
  });

  describe('validateText', () => {
    it('TC-071: 合法刻字内容通过校验', async () => {
      const result = await service.validateText({ text: '校庆纪念' });
      expect(result.valid).toBe(true);
      expect(result.charCount).toBe(4);
    });

    it('TC-072: 字数超过20字抛出异常', async () => {
      const longText = '这是一段超过二十个字符的刻字内容用于测试字数限制功能';
      await expect(service.validateText({ text: longText })).rejects.toThrow(
        BadRequestException,
      );
    });

    it('TC-073: 空字符串抛出异常', async () => {
      await expect(service.validateText({ text: '   ' })).rejects.toThrow(
        BadRequestException,
      );
    });

    it('TC-074: 包含敏感词抛出异常', async () => {
      await expect(service.validateText({ text: '违禁词1测试' })).rejects.toThrow(
        BadRequestException,
      );
    });

    it('TC-074-2: 恰好20字通过校验', async () => {
      const text = '一二三四五六七八九十一二三四五六七八九十';
      const result = await service.validateText({ text });
      expect(result.valid).toBe(true);
      expect(result.charCount).toBe(20);
    });
  });

  describe('createPreview', () => {
    it('TC-075: 正常生成预览图', async () => {
      prisma.customization.create.mockResolvedValue({
        id: BigInt(1),
        textContent: '校庆纪念',
        fontName: 'SimSun',
      });
      prisma.customization.update.mockResolvedValue({
        id: BigInt(1),
        previewImageUrl: 'https://oss.example.com/preview/1.png',
      });

      const result = await service.createPreview(BigInt(1), {
        productId: 1,
        textContent: '校庆纪念',
        fontName: 'SimSun',
      });

      expect(result.previewImageUrl).toContain('https://oss.example.com');
      expect(result.textContent).toBe('校庆纪念');
    });
  });
});

import {
  Injectable,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { ValidateTextDto } from './dto/validate-text.dto';
import { CreatePreviewDto } from './dto/create-preview.dto';

// 最大刻字字符数（REQ-060）
const MAX_CHARS = 20;

// 敏感词列表（生产中应从数据库或配置读取）
const SENSITIVE_WORDS = ['违禁词1', '违禁词2'];

@Injectable()
export class CustomizationService {
  private readonly logger = new Logger(CustomizationService.name);

  constructor(private readonly prisma: PrismaService) {}

  /** 获取可用字体列表（REQ-059） */
  async getFonts() {
    return [
      { name: 'SimSun', displayName: '宋体', preview: '校庆纪念' },
      { name: 'SimHei', displayName: '黑体', preview: '校庆纪念' },
      { name: 'KaiTi', displayName: '楷体', preview: '校庆纪念' },
      { name: 'FangSong', displayName: '仿宋', preview: '校庆纪念' },
    ];
  }

  /** 校验刻字内容（REQ-060） */
  async validateText(dto: ValidateTextDto) {
    const { text } = dto;

    // 字数校验
    if (text.length > MAX_CHARS) {
      throw new BadRequestException(`刻字内容不得超过${MAX_CHARS}个字符，当前${text.length}字`);
    }

    if (text.trim().length === 0) {
      throw new BadRequestException('刻字内容不能为空');
    }

    // 敏感词过滤
    const foundSensitive = SENSITIVE_WORDS.find((word) => text.includes(word));
    if (foundSensitive) {
      throw new BadRequestException('刻字内容包含不允许的词汇，请修改');
    }

    return { valid: true, charCount: text.length, maxChars: MAX_CHARS };
  }

  /** 生成刻字预览（REQ-061） */
  async createPreview(userId: bigint, dto: CreatePreviewDto) {
    // 先校验文字
    await this.validateText({ text: dto.textContent });

    // 创建定制记录
    const customization = await this.prisma.customization.create({
      data: {
        userId,
        productId: BigInt(dto.productId),
        textContent: dto.textContent,
        fontName: dto.fontName,
        status: 'draft',
      },
    });

    // TODO: 调用图片渲染服务（Python Pillow）生成预览图并上传OSS
    // const previewUrl = await this.renderPreview(dto.textContent, dto.fontName);
    const previewUrl = `https://oss.example.com/preview/${customization.id}.png`;

    // 更新预览图URL
    await this.prisma.customization.update({
      where: { id: customization.id },
      data: { previewImageUrl: previewUrl },
    });

    return {
      id: customization.id.toString(),
      previewImageUrl: previewUrl,
      textContent: dto.textContent,
      fontName: dto.fontName,
    };
  }
}

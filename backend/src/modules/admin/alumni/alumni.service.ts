import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { ReviewAlumniDto } from './dto/review-alumni.dto';

@Injectable()
export class AdminAlumniService {
  constructor(private readonly prisma: PrismaService) {}

  async list(status: string | undefined, page: number, pageSize: number) {
    const skip = (page - 1) * pageSize;
    const where: any = {};
    if (status) where.status = status;

    const [total, list] = await Promise.all([
      this.prisma.alumniVerification.count({ where }),
      this.prisma.alumniVerification.findMany({
        where,
        include: { user: { select: { nickname: true, avatarUrl: true } } },
        orderBy: { createdAt: 'desc' },
        skip,
        take: pageSize,
      }),
    ]);
    return { list, total, page, pageSize };
  }

  async review(id: bigint, dto: ReviewAlumniDto) {
    const verification = await this.prisma.alumniVerification.findUnique({ where: { id } });
    if (!verification) throw new NotFoundException('认证申请不存在');

    const updated = await this.prisma.alumniVerification.update({
      where: { id },
      data: {
        status: dto.approved ? 'approved' : 'rejected',
        reviewRemark: dto.remark,
        reviewedAt: new Date(),
      },
    });

    // 审核通过后更新用户认证状态
    if (dto.approved) {
      await this.prisma.user.update({
        where: { id: verification.userId },
        data: { isVerified: true },
      });
    }

    return { id: updated.id.toString(), status: updated.status };
  }
}

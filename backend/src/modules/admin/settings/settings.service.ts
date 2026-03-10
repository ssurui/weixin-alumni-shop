import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';

@Injectable()
export class AdminSettingsService {
  constructor(private readonly prisma: PrismaService) {}

  async list() {
    return this.prisma.systemSetting.findMany({ orderBy: { key: 'asc' } });
  }

  async get(key: string) {
    return this.prisma.systemSetting.findUnique({ where: { key } });
  }

  async batchUpdate(settings: { key: string; value: string }[]) {
    await Promise.all(
      settings.map((s) =>
        this.prisma.systemSetting.upsert({
          where: { key: s.key },
          create: { key: s.key, value: s.value },
          update: { value: s.value },
        }),
      ),
    );
    return null;
  }
}

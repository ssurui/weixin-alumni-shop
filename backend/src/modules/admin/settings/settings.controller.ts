import { Controller, Get, Put, Body, UseGuards } from '@nestjs/common';
import { AdminSettingsService } from './settings.service';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { Roles } from '../../../common/decorators/roles.decorator';

@Controller('admin/settings')
@UseGuards(JwtAuthGuard)
@Roles('super_admin')
export class AdminSettingsController {
  constructor(private readonly settingsService: AdminSettingsService) {}

  @Get()
  async list() {
    return this.settingsService.list();
  }

  @Put()
  async update(@Body() body: { key: string; value: string }[]) {
    return this.settingsService.batchUpdate(body);
  }
}

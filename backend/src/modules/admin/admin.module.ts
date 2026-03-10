import { Module } from '@nestjs/common';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { AdminAlumniController } from './alumni/alumni.controller';
import { AdminAlumniService } from './alumni/alumni.service';
import { AdminOrdersController } from './orders/orders.controller';
import { AdminOrdersService } from './orders/orders.service';
import { AdminProductsController } from './products/products.controller';
import { AdminProductsService } from './products/products.service';
import { AdminReportsController } from './reports/reports.controller';
import { AdminReportsService } from './reports/reports.service';
import { AdminSettingsController } from './settings/settings.controller';
import { AdminSettingsService } from './settings/settings.service';

@Module({
  controllers: [
    AdminController,
    AdminAlumniController,
    AdminOrdersController,
    AdminProductsController,
    AdminReportsController,
    AdminSettingsController,
  ],
  providers: [
    AdminService,
    AdminAlumniService,
    AdminOrdersService,
    AdminProductsService,
    AdminReportsService,
    AdminSettingsService,
  ],
  exports: [AdminService],
})
export class AdminModule {}

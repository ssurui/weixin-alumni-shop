import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards, ParseIntPipe } from '@nestjs/common';
import { AdminProductsService } from './products.service';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { Roles } from '../../../common/decorators/roles.decorator';

@Controller('admin/products')
@UseGuards(JwtAuthGuard)
@Roles('super_admin', 'product_manager')
export class AdminProductsController {
  constructor(private readonly productsService: AdminProductsService) {}

  @Get()
  async list(@Query() query: any) {
    return this.productsService.list(query);
  }

  @Get(':id')
  async detail(@Param('id', ParseIntPipe) id: number) {
    return this.productsService.detail(BigInt(id));
  }

  @Post()
  async create(@Body() body: any) {
    return this.productsService.create(body);
  }

  @Put(':id')
  async update(@Param('id', ParseIntPipe) id: number, @Body() body: any) {
    return this.productsService.update(BigInt(id), body);
  }

  @Put(':id/publish')
  async publish(@Param('id', ParseIntPipe) id: number) {
    return this.productsService.updateStatus(BigInt(id), 'published');
  }

  @Put(':id/unpublish')
  async unpublish(@Param('id', ParseIntPipe) id: number) {
    return this.productsService.updateStatus(BigInt(id), 'unpublished');
  }
}

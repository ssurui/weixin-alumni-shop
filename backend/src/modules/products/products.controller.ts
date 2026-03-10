import { Controller, Get, Param, Query, UseGuards, ParseIntPipe } from '@nestjs/common';
import { ProductsService } from './products.service';
import { ProductListDto } from './dto/product-list.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

@Controller('products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  /**
   * 获取商品分类列表（REQ-016）
   * GET /api/v1/products/categories
   */
  @Get('categories')
  async getCategories() {
    return this.productsService.getCategories();
  }

  /**
   * 获取商品列表（REQ-017, REQ-018）
   * GET /api/v1/products
   */
  @Get()
  async getProducts(@Query() query: ProductListDto) {
    return this.productsService.getProducts(query);
  }

  /**
   * 获取商品详情（REQ-019）
   * GET /api/v1/products/:id
   */
  @Get(':id')
  async getProduct(@Param('id', ParseIntPipe) id: number) {
    return this.productsService.getProduct(BigInt(id));
  }
}

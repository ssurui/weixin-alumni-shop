import {
  IsInt, IsNotEmpty, IsOptional, IsString,
  ValidateNested, IsArray, ArrayMinSize, Min,
} from 'class-validator';
import { Type } from 'class-transformer';

export class OrderItemDto {
  @IsInt()
  @IsNotEmpty()
  @Type(() => Number)
  skuId: number;

  @IsInt()
  @Min(1)
  @Type(() => Number)
  quantity: number;

  @IsOptional()
  @IsInt()
  @Type(() => Number)
  customizationId?: number;
}

export class CreateOrderDto {
  @IsInt()
  @IsNotEmpty()
  @Type(() => Number)
  addressId: number;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => OrderItemDto)
  items: OrderItemDto[];

  @IsOptional()
  @IsString()
  remark?: string;
}

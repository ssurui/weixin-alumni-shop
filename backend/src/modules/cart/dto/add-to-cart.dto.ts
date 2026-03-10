import { IsInt, IsNotEmpty, IsOptional, IsString, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';

export class AddToCartDto {
  @IsInt()
  @IsNotEmpty()
  @Type(() => Number)
  skuId: number;

  @IsInt()
  @Min(1)
  @Max(99)
  @Type(() => Number)
  quantity: number = 1;

  @IsOptional()
  @IsString()
  customizationText?: string;

  @IsOptional()
  @IsString()
  selectedFont?: string;
}

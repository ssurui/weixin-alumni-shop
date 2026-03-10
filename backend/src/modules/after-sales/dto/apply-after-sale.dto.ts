import { IsInt, IsNotEmpty, IsString, IsOptional, IsEnum, IsArray } from 'class-validator';
import { Type } from 'class-transformer';

export class ApplyAfterSaleDto {
  @IsInt()
  @IsNotEmpty()
  @Type(() => Number)
  orderId: number;

  @IsOptional()
  @IsInt()
  @Type(() => Number)
  orderItemId?: number;

  @IsEnum(['refund', 'return', 'exchange'])
  type: 'refund' | 'return' | 'exchange';

  @IsString()
  @IsNotEmpty()
  reason: string;

  @IsOptional()
  @IsArray()
  images?: string[];
}

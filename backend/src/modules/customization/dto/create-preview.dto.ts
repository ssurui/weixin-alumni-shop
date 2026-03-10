import { IsString, IsNotEmpty, IsInt, IsOptional, MaxLength } from 'class-validator';
import { Type } from 'class-transformer';

export class CreatePreviewDto {
  @IsInt()
  @IsNotEmpty()
  @Type(() => Number)
  productId: number;

  @IsString()
  @IsNotEmpty()
  @MaxLength(20)
  textContent: string;

  @IsOptional()
  @IsString()
  fontName?: string;
}

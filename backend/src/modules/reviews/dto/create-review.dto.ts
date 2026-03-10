import { IsInt, IsNotEmpty, IsOptional, IsString, IsBoolean, IsArray, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateReviewDto {
  @IsInt()
  @IsNotEmpty()
  @Type(() => Number)
  orderItemId: number;

  @IsInt()
  @Min(1)
  @Max(5)
  @Type(() => Number)
  rating: number;

  @IsOptional()
  @IsString()
  content?: string;

  @IsOptional()
  @IsBoolean()
  isAnonymous?: boolean;

  @IsOptional()
  @IsArray()
  images?: string[];
}

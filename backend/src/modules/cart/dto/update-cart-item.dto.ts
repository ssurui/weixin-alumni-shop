import { IsInt, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';

export class UpdateCartItemDto {
  @IsInt()
  @Min(1)
  @Max(99)
  @Type(() => Number)
  quantity: number;
}

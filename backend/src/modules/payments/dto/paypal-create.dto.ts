import { IsInt, IsNotEmpty } from 'class-validator';
import { Type } from 'class-transformer';

export class PaypalCreateDto {
  @IsInt()
  @IsNotEmpty()
  @Type(() => Number)
  orderId: number;
}

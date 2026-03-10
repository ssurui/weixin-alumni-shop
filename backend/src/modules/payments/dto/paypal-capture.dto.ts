import { IsString, IsNotEmpty } from 'class-validator';

export class PaypalCaptureDto {
  @IsString()
  @IsNotEmpty()
  paypalOrderId: string;
}

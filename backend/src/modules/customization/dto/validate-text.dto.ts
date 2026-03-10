import { IsString, IsNotEmpty, MaxLength } from 'class-validator';

export class ValidateTextDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(20, { message: '刻字内容不得超过20个字符' })
  text: string;
}

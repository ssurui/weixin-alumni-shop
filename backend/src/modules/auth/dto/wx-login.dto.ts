import { IsString, IsNotEmpty, IsOptional, IsUrl } from 'class-validator';

export class WxLoginDto {
  @IsString()
  @IsNotEmpty({ message: '微信登录code不能为空' })
  code: string;

  @IsOptional()
  @IsString()
  nickname?: string;

  @IsOptional()
  @IsString()
  avatarUrl?: string;
}

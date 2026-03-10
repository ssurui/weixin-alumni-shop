import { IsBoolean, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class ReviewAlumniDto {
  @IsBoolean()
  @IsNotEmpty()
  approved: boolean;

  @IsOptional()
  @IsString()
  remark?: string;
}

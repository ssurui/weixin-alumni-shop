import { IsString, IsNotEmpty, IsOptional, IsInt, Min, Max, IsUrl } from 'class-validator';

export class AlumniApplyDto {
  @IsString()
  @IsNotEmpty({ message: '真实姓名不能为空' })
  realName: string;

  @IsOptional()
  @IsString()
  studentId?: string;

  @IsOptional()
  @IsInt()
  @Min(1950)
  @Max(2030)
  graduationYear?: number;

  @IsOptional()
  @IsString()
  major?: string;

  @IsOptional()
  @IsString()
  proofImageUrl?: string;
}

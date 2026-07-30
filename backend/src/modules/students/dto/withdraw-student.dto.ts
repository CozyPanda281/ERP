import { IsString, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class WithdrawStudentDto {
  @ApiProperty()
  @IsString()
  leavingDate: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  leavingReason?: string;
}

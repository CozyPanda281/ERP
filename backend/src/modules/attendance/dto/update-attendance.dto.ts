import { IsOptional, IsString, IsIn, IsUUID, MaxLength } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateAttendanceDto {
  @ApiPropertyOptional({ enum: ['present', 'absent', 'late', 'excused'] })
  @IsOptional()
  @IsString()
  @IsIn(['present', 'absent', 'late', 'excused'])
  status?: string;
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  remarks?: string;
}

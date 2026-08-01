import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsOptional,
  IsString,
  IsBoolean,
  IsDateString,
  IsIn,
  IsUUID,
  MaxLength,
} from 'class-validator';

export class UpdateExamDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(255)
  name?: string;
  @ApiPropertyOptional({
    enum: [
      'unit_test',
      'quarterly',
      'half_yearly',
      'annual',
      'pre_board',
      'weekly_test',
    ],
  })
  @IsOptional()
  @IsString()
  @IsIn([
    'unit_test',
    'quarterly',
    'half_yearly',
    'annual',
    'pre_board',
    'weekly_test',
  ])
  examType?: string;
  @ApiPropertyOptional() @IsOptional() @IsUUID() classId?: string;
  @ApiPropertyOptional() @IsOptional() @IsUUID() academicYearId?: string;
  @ApiPropertyOptional() @IsOptional() @IsDateString() startDate?: string;
  @ApiPropertyOptional() @IsOptional() @IsDateString() endDate?: string;
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isActive?: boolean;
}

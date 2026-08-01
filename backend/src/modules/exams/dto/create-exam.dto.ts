import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsUUID,
  IsDateString,
  IsIn,
  MaxLength,
} from 'class-validator';

export class CreateExamDto {
  @ApiProperty({ example: 'Mid Term 2026' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name: string;

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

  @ApiProperty() @IsUUID() @IsNotEmpty() classId: string;

  @ApiPropertyOptional() @IsOptional() @IsUUID() academicYearId?: string;

  @ApiPropertyOptional() @IsOptional() @IsDateString() startDate?: string;

  @ApiPropertyOptional() @IsOptional() @IsDateString() endDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string;
}

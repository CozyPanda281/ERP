import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsOptional,
  IsString,
  IsNumber,
  IsDateString,
  IsUUID,
  Min,
  Max,
} from 'class-validator';

export class UpdateScheduleDto {
  @ApiPropertyOptional() @IsOptional() @IsUUID() subjectId?: string;
  @ApiPropertyOptional() @IsOptional() @IsUUID() classId?: string;
  @ApiPropertyOptional() @IsOptional() @IsDateString() date?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() startTime?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() endTime?: string;
  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(1000)
  maxMarks?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) passMarks?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() roomNumber?: string;
  @ApiPropertyOptional() @IsOptional() @IsUUID() invigilatorId?: string;
}

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsUUID, IsNotEmpty, IsOptional, IsDateString, IsString, IsNumber, Min, Max } from 'class-validator';

export class CreateScheduleDto {
  @ApiProperty() @IsUUID() @IsNotEmpty() subjectId: string;

  @ApiPropertyOptional() @IsOptional() @IsUUID() classId?: string;

  @ApiProperty() @IsDateString() @IsNotEmpty() date: string;

  @ApiPropertyOptional() @IsOptional() @IsString() startTime?: string;

  @ApiPropertyOptional() @IsOptional() @IsString() endTime?: string;

  @ApiPropertyOptional({ default: 100 }) @IsOptional() @IsNumber() @Min(1) @Max(1000) maxMarks?: number;

  @ApiPropertyOptional({ default: 33 }) @IsOptional() @IsNumber() @Min(0) passMarks?: number;

  @ApiPropertyOptional() @IsOptional() @IsString() roomNumber?: string;

  @ApiPropertyOptional() @IsOptional() @IsUUID() invigilatorId?: string;
}

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsUUID, IsNotEmpty, IsOptional, IsNumber, IsBoolean, IsString, Min, Max, IsArray, ValidateNested, IsIn } from 'class-validator';
import { Type } from 'class-transformer';

export class MarkEntryDto {
  @ApiProperty() @IsUUID() @IsNotEmpty() studentId: string;

  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) marksObtained?: number;

  @ApiPropertyOptional() @IsOptional() @IsBoolean() isAbsent?: boolean;

  @ApiPropertyOptional() @IsOptional() @IsBoolean() isMalpractice?: boolean;

  @ApiPropertyOptional() @IsOptional() @IsString() grade?: string;

  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) @Max(10) gradePoint?: number;

  @ApiPropertyOptional() @IsOptional() @IsString() remarks?: string;
}

export class BulkMarksDto {
  @ApiProperty() @IsUUID() @IsNotEmpty() examScheduleId: string;

  @ApiProperty({ type: [MarkEntryDto] })
  @IsArray() @ValidateNested({ each: true }) @Type(() => MarkEntryDto)
  marks: MarkEntryDto[];
}

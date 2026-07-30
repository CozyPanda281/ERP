import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional, IsUUID, IsIn, IsBoolean, MaxLength, IsArray, ValidateNested, IsNumber, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';

export class FeeItemDto {
  @ApiProperty() @IsString() @IsNotEmpty() @MaxLength(255) name: string;
  @ApiProperty() @IsNumber() @Min(0) amount: number;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isOptional?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isRecurring?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsString() @IsIn(['monthly', 'quarterly', 'half_yearly', 'annual', 'one_time']) frequency?: string;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(1) @Max(31) dueDay?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() sortOrder?: number;
}

export class CreateFeeStructureDto {
  @ApiProperty({ example: 'Class 10 Fee Structure 2026' })
  @IsString() @IsNotEmpty() @MaxLength(255) name: string;

  @ApiProperty() @IsUUID() @IsNotEmpty() classId: string;

  @ApiPropertyOptional() @IsOptional() @IsUUID() academicYearId?: string;

  @ApiPropertyOptional({ enum: ['monthly', 'quarterly', 'half_yearly', 'annual'] })
  @IsOptional() @IsString() @IsIn(['monthly', 'quarterly', 'half_yearly', 'annual']) frequency?: string;

  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(1000) description?: string;

  @ApiProperty({ type: [FeeItemDto] })
  @IsArray() @ValidateNested({ each: true }) @Type(() => FeeItemDto)
  items: FeeItemDto[];
}

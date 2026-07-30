import { IsString, IsNotEmpty, IsOptional, IsBoolean } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateAcademicYearDto {
  @ApiProperty() @IsString() @IsNotEmpty() branchId: string;
  @ApiProperty({ example: '2026-2027' }) @IsString() @IsNotEmpty() name: string;
  @ApiProperty({ example: '2026-04-01' }) @IsString() @IsNotEmpty() startDate: string;
  @ApiProperty({ example: '2027-03-31' }) @IsString() @IsNotEmpty() endDate: string;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isCurrent?: boolean;
}

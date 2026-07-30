import { IsString, IsNotEmpty, IsOptional, IsBoolean } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateSubjectDto {
  @ApiProperty() @IsString() @IsNotEmpty() branchId: string;
  @ApiProperty({ example: 'Mathematics' }) @IsString() @IsNotEmpty() name: string;
  @ApiPropertyOptional({ example: 'MATH101' }) @IsOptional() @IsString() code?: string;
  @ApiPropertyOptional({ enum: ['theory', 'practical', 'both'] }) @IsOptional() @IsString() subjectType?: string;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isLanguage?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsString() description?: string;
}

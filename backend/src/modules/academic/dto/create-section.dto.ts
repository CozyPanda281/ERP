import { IsString, IsNotEmpty, IsOptional, IsNumber } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateSectionDto {
  @ApiProperty() @IsString() @IsNotEmpty() branchId: string;
  @ApiProperty() @IsString() @IsNotEmpty() classId: string;
  @ApiProperty({ example: 'A' }) @IsString() @IsNotEmpty() name: string;
  @ApiPropertyOptional() @IsOptional() @IsString() code?: string;
  @ApiPropertyOptional() @IsOptional() @IsNumber() capacity?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() roomNumber?: string;
}

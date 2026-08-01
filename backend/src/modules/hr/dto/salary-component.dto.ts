import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsBoolean,
  IsNumber,
  IsIn,
} from 'class-validator';

export class CreateSalaryComponentDto {
  @ApiProperty() @IsString() @IsNotEmpty() name: string;
  @ApiProperty() @IsString() @IsIn(['earning', 'deduction']) type: string;
  @ApiPropertyOptional() @IsOptional() @IsString() calculationType?: string;
  @ApiPropertyOptional() @IsOptional() @IsNumber() value?: number;
}

export class UpdateSalaryComponentDto {
  @ApiPropertyOptional() @IsOptional() @IsString() name?: string;
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @IsIn(['earning', 'deduction'])
  type?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() calculationType?: string;
  @ApiPropertyOptional() @IsOptional() @IsNumber() value?: number;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isActive?: boolean;
}

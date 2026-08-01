import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsIn,
  IsNumber,
  Min,
  IsBoolean,
  IsDateString,
  IsArray,
} from 'class-validator';

export class CreateDiscountDto {
  @ApiProperty() @IsString() @IsNotEmpty() name: string;

  @ApiProperty({ enum: ['percentage', 'fixed'] })
  @IsString()
  @IsNotEmpty()
  @IsIn(['percentage', 'fixed'])
  discountType: string;

  @ApiProperty() @IsNumber() @Min(0) value: number;

  @ApiPropertyOptional({ enum: ['all', 'class', 'student', 'category'] })
  @IsOptional()
  @IsString()
  @IsIn(['all', 'class', 'student', 'category'])
  applicableTo?: string;

  @ApiPropertyOptional() @IsOptional() @IsArray() applicableIds?: string[];

  @ApiPropertyOptional() @IsOptional() @IsBoolean() isActive?: boolean;

  @ApiPropertyOptional() @IsOptional() @IsDateString() validFrom?: string;

  @ApiPropertyOptional() @IsOptional() @IsDateString() validUntil?: string;
}

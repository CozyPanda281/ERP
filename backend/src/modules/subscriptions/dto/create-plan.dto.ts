import {
  IsString,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsBoolean,
  Min,
  IsObject,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreatePlanDto {
  @ApiProperty({ example: 'Professional' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ example: 'pro' })
  @IsString()
  @IsNotEmpty()
  code: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ example: 499 })
  @IsNumber()
  @Min(0)
  priceMonthly: number;

  @ApiProperty({ example: 4999 })
  @IsNumber()
  @Min(0)
  priceYearly: number;

  @ApiProperty({ example: 1 })
  @IsNumber()
  @Min(0)
  maxBranches: number;

  @ApiProperty({ example: 100 })
  @IsNumber()
  @Min(0)
  maxUsers: number;

  @ApiProperty({ example: 1000 })
  @IsNumber()
  @Min(0)
  maxStudents: number;

  @ApiProperty({ example: 50 })
  @IsNumber()
  @Min(0)
  maxStaff: number;

  @ApiProperty({ example: 1024 })
  @IsNumber()
  @Min(0)
  storageLimitMb: number;

  @ApiProperty({ example: { reception: true, hostel: false } })
  @IsObject()
  features: Record<string, boolean>;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  sortOrder?: number;
}

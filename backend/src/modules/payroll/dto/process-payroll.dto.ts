import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsInt,
  Min,
  IsOptional,
  IsArray,
} from 'class-validator';

export class ProcessPayrollDto {
  @ApiProperty() @IsString() @IsNotEmpty() staffId: string;
  @ApiProperty() @IsInt() @Min(1) month: number;
  @ApiProperty() @IsInt() @Min(2020) year: number;
  @ApiPropertyOptional() @IsOptional() @IsString() basicPay?: string;
  @ApiPropertyOptional() @IsOptional() @IsArray() allowances?: any[];
  @ApiPropertyOptional() @IsOptional() @IsArray() deductions?: any[];
  @ApiPropertyOptional() @IsOptional() @IsString() grossPay?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() totalDeductions?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() netPay?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() paymentDate?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() paymentMethod?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() transactionRef?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() remarks?: string;
}

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNumber, IsOptional, IsString, IsDateString } from 'class-validator';

export class ProcessPayrollDto {
  @ApiProperty() @IsString() staffId: string;
  @ApiProperty() @IsNumber() month: number;
  @ApiProperty() @IsNumber() year: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() basicPay?: number;
  @ApiPropertyOptional() @IsOptional() allowances?: { componentId: string; amount: number }[];
  @ApiPropertyOptional() @IsOptional() deductions?: { componentId: string; amount: number }[];
  @ApiPropertyOptional() @IsOptional() @IsDateString() paymentDate?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() paymentMethod?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() transactionRef?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() remarks?: string;
}

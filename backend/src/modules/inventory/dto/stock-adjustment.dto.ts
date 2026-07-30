import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional } from 'class-validator';

export class StockAdjustmentDto {
  @ApiProperty() @IsString() @IsNotEmpty() itemId: string;
  @ApiProperty() @IsString() @IsNotEmpty() adjustmentType: string;
  @ApiProperty() @IsNotEmpty() quantity: number;
  @ApiPropertyOptional() @IsOptional() @IsString() reason?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() referenceNumber?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() notes?: string;
}

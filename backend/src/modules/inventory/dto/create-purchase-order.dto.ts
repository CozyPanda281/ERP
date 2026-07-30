import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsArray,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreatePurchaseOrderItemDto {
  @ApiProperty() @IsString() @IsNotEmpty() itemId: string;
  @ApiProperty() @IsNotEmpty() quantity: number;
  @ApiProperty() @IsNotEmpty() unitPrice: number;
}

export class CreatePurchaseOrderDto {
  @ApiProperty() @IsString() @IsNotEmpty() supplierId: string;
  @ApiPropertyOptional() @IsOptional() @IsString() orderDate?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() expectedDate?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() notes?: string;
  @ApiPropertyOptional()
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreatePurchaseOrderItemDto)
  items?: CreatePurchaseOrderItemDto[];
}
